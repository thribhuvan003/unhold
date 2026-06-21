import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { requireCaseAccess } from '@/lib/auth/case-access';
import { assertProofGate, checkProofGates } from '@/lib/escalations/proof-gates';
import { computeResponseDueAt } from '@/lib/escalations/ladder';
import { runCaseTick } from '@/lib/loops/case-tick';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  parseIdempotentReplay,
  requireIdempotencyKey,
} from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { transitionCase } from '@/lib/state-machine/transition';
import { MarkSentBodySchema } from '@/lib/validation/escalation-schemas';

const ParamsSchema = z.object({
  id: z.string().uuid(),
  eid: z.string().uuid(),
});

const IDEM_SCOPE = 'mark_sent';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; eid: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const params = ParamsSchema.parse(await context.params);
    const idempotencyKey = requireIdempotencyKey(request);
    const { replay } = await beginIdempotentRequest(IDEM_SCOPE, idempotencyKey);
    if (replay && replay.body !== '__pending__') {
      const parsed = parseIdempotentReplay(replay);
      return jsonSuccess(parsed.body, { status: parsed.status });
    }

    const body = MarkSentBodySchema.parse(await request.json());
    const access = await requireCaseAccess(request, params.id);

    const admin = createAdminClient();
    const { data: escalation, error } = await admin
      .from('escalations')
      .select('*')
      .eq('id', params.eid)
      .eq('case_id', params.id)
      .maybeSingle();

    if (error || !escalation) {
      throw new ApiError(404, 'not_found', 'Escalation not found');
    }

    if (escalation.status !== 'approved') {
      throw new ApiError(422, 'guard_failed', 'Escalation must be approved before mark-sent', {
        guard: 'user_approved',
      });
    }

    const gate = await checkProofGates(params.id, escalation.level);
    assertProofGate(gate);

    const { data: proofEvidence, error: proofError } = await admin
      .from('evidence')
      .select('id, evidence_type, case_id, deleted_at')
      .eq('id', body.proof_evidence_id)
      .eq('case_id', params.id)
      .maybeSingle();

    if (proofError || !proofEvidence || proofEvidence.deleted_at) {
      throw new ApiError(422, 'guard_failed', 'proof_evidence_id is required and must belong to this case', {
        guard: 'proof_evidence_required',
      });
    }

    if (proofEvidence.evidence_type !== 'letter_sent_proof') {
      throw new ApiError(422, 'guard_failed', 'Proof evidence must be letter_sent_proof', {
        guard: 'proof_evidence_type',
      });
    }

    const sentAt = body.sent_at ? new Date(body.sent_at) : new Date();
    const responseDueAt = computeResponseDueAt(sentAt, escalation.level);

    const { data: updated, error: updateError } = await admin
      .from('escalations')
      .update({
        status: 'sent',
        sent_at: sentAt.toISOString(),
        sent_proof_evidence_id: body.proof_evidence_id,
        response_due_at: responseDueAt.toISOString(),
      })
      .eq('id', params.eid)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw new ApiError(500, 'internal_error', updateError?.message ?? 'mark_sent_failed');
    }

    const priorLevel =
      escalation.level === 'L2' ? 'L1' : escalation.level === 'L3' ? 'L2' : escalation.level === 'L4' ? 'L3' : null;

    await transitionCase({
      caseId: params.id,
      toStatus: 'awaiting_response',
      trigger: 'user.mark_sent',
      actorType: access.actorType,
      actorId: access.actorId,
      payload: {
        escalation_id: params.eid,
        escalation_level: escalation.level,
        required_proof: priorLevel,
        proof_evidence_id: body.proof_evidence_id,
      },
    });

    await admin.from('action_logs').insert({
      case_id: params.id,
      actor_type: access.actorType,
      actor_id: access.actorId,
      action: 'escalation.mark_sent',
      payload_json: {
        escalation_id: params.eid,
        level: escalation.level,
        proof_evidence_id: body.proof_evidence_id,
        sent_at: sentAt.toISOString(),
        response_due_at: responseDueAt.toISOString(),
      },
    });

    await runCaseTick(params.id, { type: 'mark_sent', escalation_id: params.eid });

    const responseBody = {
      escalation: updated,
      request_id: requestId,
    };
    await completeIdempotentRequest(IDEM_SCOPE, idempotencyKey, 200, responseBody);
    return jsonSuccess(responseBody);
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}