import { NextRequest } from 'next/server';
import { requireRequestAuth, serializeCase } from '@/lib/api/case-access';
import { claimCaseSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);

    if (!auth.userId) {
      throw new ApiError(401, 'unauthorized', 'Authenticated user required to claim case');
    }

    const body = await parseJsonBody(request, requestId);
    const parsed = claimCaseSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    if (!auth.guestSessionId) {
      throw new ApiError(401, 'unauthorized', 'Open the guest case on this device before claiming it');
    }

    const admin = createAdminClient();
    const { data: caseRow, error: caseError } = await admin
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .maybeSingle();

    if (caseError || !caseRow) {
      throw new ApiError(404, 'not_found', 'Case not found');
    }

    if (caseRow.user_id) {
      throw new ApiError(409, 'conflict', 'Case already claimed');
    }

    if (caseRow.guest_session_id !== auth.guestSessionId) {
      throw new ApiError(403, 'forbidden', 'Guest session does not own this case');
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('cases')
      .update({
        user_id: auth.userId,
        guest_session_id: null,
        last_activity_at: now,
      })
      .eq('id', caseId)
      .select('*')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new ApiError(500, 'internal_error', 'Failed to claim case');
    }

    await admin
      .from('guest_sessions')
      .update({ claimed_by: auth.userId, claimed_at: now })
      .eq('id', auth.guestSessionId);

    await appendActionLog({
      caseId,
      actorType: 'user',
      actorId: auth.userId,
      action: 'case.claimed',
      payload: { guest_session_id: auth.guestSessionId },
      requestId,
    });

    const response = jsonSuccess(serializeCase(updated));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
