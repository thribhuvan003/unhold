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
      .select('id, event_type, created_at, metadata_json')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    // Customer-safe payload: human message + minimal verifier fields so papers
    // polling can match evidence.verified without exposing internal agent state.
    const events = (data ?? [])
      .map((event) => {
        const message = CUSTOMER_EVENT_COPY[event.event_type];
        if (!message) return null;
        const meta =
          event.event_type === 'evidence.verified' &&
          event.metadata_json &&
          typeof event.metadata_json === 'object'
            ? (event.metadata_json as Record<string, unknown>)
            : null;
        return {
          id: event.id,
          event_type: event.event_type,
          message,
          created_at: event.created_at,
          metadata_json: meta
            ? {
                evidence_id: meta.evidence_id,
                confidence: meta.confidence,
                forgery_risk: meta.forgery_risk,
                mismatches: meta.mismatches,
                human_review_required: meta.human_review_required,
                relevant: meta.relevant,
                document_kind: meta.document_kind,
              }
            : undefined,
        };
      })
      .filter((event): event is NonNullable<typeof event> => event !== null);

    const response = jsonSuccess({ events });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
