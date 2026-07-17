import type { NextRequest } from "next/server";
import { z } from "zod";
import { ApiError } from "@/lib/api/errors";
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
} from "@/lib/api/response";
import { assertCaseAccess, requireRequestAuth } from "@/lib/api/case-access";
import {
  assertProofGate,
  checkProofGates,
} from "@/lib/escalations/proof-gates";
import { computeResponseDueAt } from "@/lib/escalations/ladder";
import { runCaseTick } from "@/lib/loops/case-tick";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionCase } from "@/lib/state-machine/transition";

const ParamsSchema = z.object({
  id: z.string().uuid(),
  eid: z.string().uuid(),
});

const SENT_STATUSES = ["sent", "response_received", "timeout"] as const;

/**
 * Lightweight "I sent it" — records the send WITHOUT a proof photo so the
 * follow-through funnel doesn't die at the upload step.
 *
 * The proof chain is intentionally untouched:
 * - The prior-level proof gate still applies here (you cannot claim L2 sent
 *   without L1 send-proof), and
 * - sent_proof_evidence_id stays NULL, so the NEXT level remains locked until
 *   real proof is uploaded via the full mark-sent flow.
 * Review-before-send also holds: only an approved letter can be marked sent.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; eid: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const params = ParamsSchema.parse(await context.params);
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(params.id, auth, "editor");

    const admin = createAdminClient();
    const { data: escalation, error } = await admin
      .from("escalations")
      .select("*")
      .eq("id", params.eid)
      .eq("case_id", params.id)
      .maybeSingle();

    if (error || !escalation) {
      throw new ApiError(404, "not_found", "Escalation not found");
    }

    // Natural idempotence: already recorded as sent (with or without proof).
    if ((SENT_STATUSES as readonly string[]).includes(escalation.status)) {
      return jsonSuccess({ escalation, already_sent: true, request_id: requestId });
    }

    if (escalation.status !== "approved") {
      throw new ApiError(
        422,
        "guard_failed",
        "Open your letter and approve it before recording the send",
        { guard: "user_approved" },
      );
    }

    // Prior-level proof chain still applies — identical to full mark-sent.
    const gate = await checkProofGates(params.id, escalation.level);
    assertProofGate(gate);

    const sentAt = new Date();
    const responseDueAt = computeResponseDueAt(sentAt, escalation.level);

    const { data: updated, error: updateError } = await admin
      .from("escalations")
      .update({
        status: "sent",
        sent_at: sentAt.toISOString(),
        // sent_proof_evidence_id intentionally NOT set — next level stays
        // locked until proof is uploaded through the full mark-sent flow.
        response_due_at: responseDueAt.toISOString(),
      })
      .eq("id", params.eid)
      .eq("case_id", params.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      throw new ApiError(
        500,
        "internal_error",
        updateError?.message ?? "mark_sent_lite_failed",
      );
    }

    await transitionCase({
      caseId: params.id,
      toStatus: "awaiting_response",
      trigger: "user.mark_sent",
      actorType: auth.actorType,
      actorId: auth.actorId,
      payload: {
        escalation_id: params.eid,
        escalation_level: escalation.level,
        proof_evidence_id: null,
        lite: true,
      },
    });

    await admin.from("action_logs").insert({
      case_id: params.id,
      actor_type: auth.actorType,
      actor_id: auth.actorId,
      action: "escalation.mark_sent_lite",
      payload_json: {
        escalation_id: params.eid,
        level: escalation.level,
        sent_at: sentAt.toISOString(),
        response_due_at: responseDueAt.toISOString(),
      },
    });

    await runCaseTick(params.id, {
      type: "mark_sent",
      escalation_id: params.eid,
    });

    return jsonSuccess({ escalation: updated, request_id: requestId });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
