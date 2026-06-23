import type { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { enforceSwarmEventsReadLimit } from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'viewer');
    await enforceSwarmEventsReadLimit(caseId);

    const requestedLimit = Number(request.nextUrl.searchParams.get('limit'));
    const limit = Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, MAX_LIMIT)
      : DEFAULT_LIMIT;

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('swarm_events')
      .select('id, agent_role, event_type, severity, message, metadata_json, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const response = jsonSuccess({ events: data ?? [] });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
