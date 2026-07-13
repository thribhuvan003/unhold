import type { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { enforceSwarmEventsReadLimit } from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const CUSTOMER_EVENT_COPY: Record<string, string> = {
  'evidence.verified': 'Your document check is complete.',
  'evidence.bundled': 'Your evidence package is ready.',
  'letter.drafted': 'Your draft letter is ready to review.',
  'notice.analyzed': 'Your notice summary is ready to review.',
  deadline_reminder_sent: 'Your reminder was sent.',
};

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
      .select('id, event_type, created_at')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const events = (data ?? [])
      .map((event) => ({
        id: event.id,
        message: CUSTOMER_EVENT_COPY[event.event_type],
        created_at: event.created_at,
      }))
      .filter((event): event is typeof event & { message: string } => Boolean(event.message));

    const response = jsonSuccess({ events });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
