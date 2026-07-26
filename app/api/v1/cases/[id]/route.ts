import { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth, serializeCase } from '@/lib/api/case-access';
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

    const access = await assertCaseAccess(caseRow.id, auth, 'viewer');

    const response = jsonSuccess(serializeCase(caseRow, access === 'viewer'));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
