import { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import {
  beginIdempotentRequest,
  completeIdempotentRequest,
  enforceTransitionRateLimit,
  parseIdempotentReplay,
  requireIdempotencyKey,
} from '@/lib/ratelimit';
import { transitionRequestSchema } from '@/lib/validation/api-schemas';
import { applyTransition } from '@/lib/state-machine/transitions';
import { serializeCase } from '@/lib/api/case-access';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'owner');

    const idempotencyKey = requireIdempotencyKey(request);
    const scope = `transitions:${caseId}`;
    const { replay } = await beginIdempotentRequest(scope, idempotencyKey);
    if (replay && replay.body !== '__pending__') {
      const parsed = parseIdempotentReplay(replay);
      if (parsed.status === 0) {
        return jsonError(409, 'idempotency_conflict', 'Request still in progress', requestId);
      }
      const response = jsonSuccess(parsed.body, { status: parsed.status });
      response.headers.set('x-request-id', requestId);
      return response;
    }

    await enforceTransitionRateLimit(caseId);

    const body = await parseJsonBody(request, requestId);
    const parsed = transitionRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const caseRow = await applyTransition({
      caseId,
      event: parsed.data.event,
      payload: parsed.data.payload,
      actorType: auth.actorType,
      actorId: auth.actorId,
      requestId,
    });

    const payload = { case: serializeCase(caseRow as Record<string, unknown>) };
    await completeIdempotentRequest(scope, idempotencyKey, 200, payload);
    const response = jsonSuccess(payload);
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}