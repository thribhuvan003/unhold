import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { requireCaseAccess } from '@/lib/auth/case-access';
import { assertProofGate, checkProofGates } from '@/lib/escalations/proof-gates';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApproveEscalationBodySchema } from '@/lib/validation/escalation-schemas';

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
    const access = await requireCaseAccess(request, params.id);

    let body: unknown = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }
    ApproveEscalationBodySchema.parse(body);

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

    if (!['draft', 'pending_approval'].includes(escalation.status)) {
      throw new ApiError(409, 'conflict', `Cannot approve escalation in status ${escalation.status}`);
    }

    const gate = await checkProofGates(params.id, escalation.level);
    assertProofGate(gate);

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('escalations')
      .update({
        status: 'approved',
        approved_at: now,
      })
      .eq('id', params.eid)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw new ApiError(500, 'internal_error', updateError?.message ?? 'approve_failed');
    }

    await admin.from('action_logs').insert({
      case_id: params.id,
      actor_type: access.actorType,
      actor_id: access.actorId,
      action: 'escalation.approved',
      payload_json: {
        escalation_id: params.eid,
        level: escalation.level,
      },
    });

    return jsonSuccess({ escalation: updated, request_id: requestId });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}