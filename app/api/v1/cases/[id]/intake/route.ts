import { NextRequest } from 'next/server';
import {
  assertCaseAccess,
  requireRequestAuth,
  serializeCase,
} from '@/lib/api/case-access';
import { patchIntakeSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/supabase/database.types';
import { appendActionLog } from '@/lib/action-logs/append';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'editor');

    const body = await parseJsonBody(request, requestId);
    const parsed = patchIntakeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from('cases')
      .select('intake_json')
      .eq('id', caseId)
      .single();

    if (fetchError || !existing) {
      throw new ApiError(404, 'not_found', 'Case not found');
    }

    const mergedIntake = {
      ...(existing.intake_json as Record<string, unknown>),
      ...(parsed.data.intake_json ?? {}),
    };

    const updatePayload = {
      ...parsed.data,
      intake_json: mergedIntake,
      last_activity_at: new Date().toISOString(),
    };
    delete (updatePayload as { intake_json?: unknown }).intake_json;
    (updatePayload as Record<string, unknown>).intake_json = mergedIntake;

    const { data: updated, error } = await admin
      .from('cases')
      .update({
        freeze_reason: parsed.data.freeze_reason,
        freeze_type: parsed.data.freeze_type,
        victim_role: parsed.data.victim_role,
        frozen_amount_paise: parsed.data.frozen_amount_paise,
        account_last4: parsed.data.account_last4,
        state_code: parsed.data.state_code,
        district: parsed.data.district,
        narration_codes: parsed.data.narration_codes,
        ncrp_id: parsed.data.ncrp_id,
        intake_json: mergedIntake as Json,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', caseId)
      .select('*')
      .single();

    if (error || !updated) {
      throw error ?? new ApiError(500, 'internal_error', 'Failed to update intake');
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.intake_updated',
      payload: { fields: Object.keys(parsed.data) },
      requestId,
    });

    const response = jsonSuccess(serializeCase(updated));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}