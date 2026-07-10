import { NextRequest } from 'next/server';
import { requireRequestAuth, serializeCase } from '@/lib/api/case-access';
import { verifyGuestToken, extractGuestToken } from '@/lib/auth/guest';
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

    const guestToken = parsed.data.guest_token ?? extractGuestToken(request);
    if (!guestToken) {
      throw new ApiError(400, 'validation_failed', 'Guest token required to claim case');
    }

    const guestPayload = verifyGuestToken(guestToken);
    if (!guestPayload) {
      throw new ApiError(401, 'unauthorized', 'Invalid guest token');
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

    if (caseRow.guest_session_id !== guestPayload.sub) {
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
      .eq('id', guestPayload.sub);

    await appendActionLog({
      caseId,
      actorType: 'user',
      actorId: auth.userId,
      action: 'case.claimed',
      payload: { guest_session_id: guestPayload.sub },
      requestId,
    });

    const response = jsonSuccess(serializeCase(updated));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}