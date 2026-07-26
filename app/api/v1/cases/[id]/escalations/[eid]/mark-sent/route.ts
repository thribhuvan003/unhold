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
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  parseIdempotentReplay,
  requireIdempotencyKey,
} from "@/lib/ratelimit";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionCase } from "@/lib/state-machine/transition";
import { MarkSentBodySchema } from "@/lib/validation/escalation-schemas";

const ParamsSchema = z.object({
  id: z.string().uuid(),
  eid: z.string().uuid(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; eid: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const params = ParamsSchema.parse(await context.params);
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(params.id, auth, "editor");

    const idempotencyScope = `mark_sent:${params.id}:${params.eid}`;
    const idempotencyKey = requireIdempotencyKey(request);
    const { replay } = await beginIdempotentRequest(
      idempotencyScope,
      idempotencyKey,
    );
    if (replay && replay.body !== "__pending__") {
      const parsed = parseIdempotentReplay(replay);
      return jsonSuccess(parsed.body, { status: parsed.status });
    }

    const body = MarkSentBodySchema.parse(await request.json());

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

    // Idempotent success when already marked sent (e.g. partial retry after
    // a historical non-atomic failure that left status=sent).
    const alreadySent = escalation.status === "sent";
    if (!alreadySent && escalation.status !== "approved") {
      throw new ApiError(
        422,
        "guard_failed",
        "Escalation must be approved before mark-sent",
        {
          guard: "user_approved",
        },
      );
    }

    const gate = await checkProofGates(params.id, escalation.level);
    assertProofGate(gate);

    const { data: proofEvidence, error: proofError } = await admin
      .from("evidence")
      .select("id, evidence_type, case_id, deleted_at")
      .eq("id", body.proof_evidence_id)
      .eq("case_id", params.id)
      .maybeSingle();

    if (proofError || !proofEvidence || proofEvidence.deleted_at) {
      throw new ApiError(
        422,
        "guard_failed",
        "proof_evidence_id is required and must belong to this case",
        {
          guard: "proof_evidence_required",
        },
      );
    }

    if (proofEvidence.evidence_type !== "letter_sent_proof") {
      throw new ApiError(
        422,
        "guard_failed",
        "Proof evidence must be letter_sent_proof",
        {
          guard: "proof_evidence_type",
        },
      );
    }

    const sentAt = body.sent_at
      ? new Date(body.sent_at)
      : escalation.sent_at
        ? new Date(escalation.sent_at)
        : new Date();
    const responseDueAt =
      escalation.response_due_at && alreadySent
        ? new Date(escalation.response_due_at)
        : computeResponseDueAt(sentAt, escalation.level);

    const priorLevel =
      escalation.level === "L2"
        ? "L1"
        : escalation.level === "L3"
          ? "L2"
          : escalation.level === "L4"
            ? "L3"
            : null;

    // Transition case FIRST so we never leave escalation.status=sent while
    // case.status is still intake_scoping (the non-atomic bug from prod QA).
    await transitionCase({
      caseId: params.id,
      toStatus: "awaiting_response",
      trigger: "user.mark_sent",
      actorType: auth.actorType,
      actorId: auth.actorId,
      payload: {
        escalation_id: params.eid,
        escalation_level: escalation.level,
        required_proof: priorLevel,
        proof_evidence_id: body.proof_evidence_id,
      },
    });

    let updated = escalation;
    if (!alreadySent) {
      const { data: sentRow, error: updateError } = await admin
        .from("escalations")
        .update({
          status: "sent",
          sent_at: sentAt.toISOString(),
          sent_proof_evidence_id: body.proof_evidence_id,
          response_due_at: responseDueAt.toISOString(),
        })
        .eq("id", params.eid)
        .eq("case_id", params.id)
        .eq("status", "approved")
        .select("*")
        .maybeSingle();

      if (updateError) {
        throw new ApiError(500, "internal_error", updateError.message);
      }
      if (!sentRow) {
        // Race: another request may have completed mark-sent; re-read.
        const { data: reread } = await admin
          .from("escalations")
          .select("*")
          .eq("id", params.eid)
          .eq("case_id", params.id)
          .maybeSingle();
        if (!reread || reread.status !== "sent") {
          throw new ApiError(
            409,
            "conflict",
            "Could not mark escalation sent after case transition",
          );
        }
        updated = reread;
      } else {
        updated = sentRow;
      }

      await admin.from("action_logs").insert({
        case_id: params.id,
        actor_type: auth.actorType,
        actor_id: auth.actorId,
        action: "escalation.mark_sent",
        payload_json: {
          escalation_id: params.eid,
          level: escalation.level,
          proof_evidence_id: body.proof_evidence_id,
          sent_at: sentAt.toISOString(),
          response_due_at: responseDueAt.toISOString(),
        },
      });
    } else {
      // Heal proof fields if a prior partial write missed them.
      if (
        !escalation.sent_proof_evidence_id ||
        escalation.sent_proof_evidence_id !== body.proof_evidence_id
      ) {
        const { data: healed } = await admin
          .from("escalations")
          .update({
            sent_proof_evidence_id: body.proof_evidence_id,
            sent_at: sentAt.toISOString(),
            response_due_at: responseDueAt.toISOString(),
          })
          .eq("id", params.eid)
          .eq("case_id", params.id)
          .select("*")
          .maybeSingle();
        if (healed) updated = healed;
      }
    }

    await runCaseTick(params.id, {
      type: "mark_sent",
      escalation_id: params.eid,
    });

    const responseBody = {
      escalation: updated,
      request_id: requestId,
    };
    await completeIdempotentRequest(
      idempotencyScope,
      idempotencyKey,
      200,
      responseBody,
    );
    return jsonSuccess(responseBody);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
