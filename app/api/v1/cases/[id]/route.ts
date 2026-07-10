import { NextRequest } from 'next/server';
import { requireRequestAuth, serializeCase } from '@/lib/api/case-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

function isPublicId(ref: string): boolean {
  return /^LL-\d+$/i.test(ref);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseRef } = await context.params;
    const auth = await requireRequestAuth(request);
    const admin = createAdminClient();

    const query = admin.from('cases').select('*');
    const { data: caseRow, error } = isPublicId(caseRef)
      ? await query.eq('public_id', caseRef).maybeSingle()
      : await query.eq('id', caseRef).maybeSingle();

    if (error || !caseRow) {
      throw new ApiError(404, 'not_found', 'Case not found');
    }

    if (auth.userId && caseRow.user_id !== auth.userId) {
      const { data: permission } = await admin
        .from('permissions')
        .select('id')
        .eq('case_id', caseRow.id)
        .eq('grantee_user_id', auth.userId)
        .is('revoked_at', null)
        .maybeSingle();
      if (!permission) {
        throw new ApiError(403, 'forbidden', 'You do not have access to this case');
      }
    } else if (!auth.userId) {
      if (
        caseRow.guest_session_id !== auth.guestSessionId ||
        caseRow.user_id !== null
      ) {
        throw new ApiError(403, 'forbidden', 'You do not have access to this case');
      }
    }

    const response = jsonSuccess(serializeCase(caseRow));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}