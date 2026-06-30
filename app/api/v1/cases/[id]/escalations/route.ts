import type { NextRequest } from 'next/server';
import { enqueueAgentJob } from '@/lib/jobs/enqueue';
import { createClient } from '@/lib/supabase/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';

const VALID_LEVELS = new Set(['L1', 'L2', 'L3']);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'viewer');
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('escalations')
      .select('*')
      .eq('case_id', caseId)
      .order('level', { ascending: true });

    if (error) {
      throw new ApiError(500, 'internal_error', error.message);
    }

    return jsonSuccess({ escalations: data ?? [] });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'editor');

    const body = (await parseJsonBody(request, requestId)) as { level?: string };
    const level = body.level ?? 'L1';
    if (!VALID_LEVELS.has(level)) {
      throw new ApiError(400, 'validation_failed', 'Invalid level');
    }

    const result = await enqueueAgentJob({
      case_id: caseId,
      job_type: 'draft_letter',
      agent_role: 'DRAFTER',
      idempotency_key: `draft_letter:${caseId}:${level}:${Date.now()}`,
      payload: { case_id: caseId, level },
    });

    return jsonSuccess(result, { status: result.enqueued ? 201 : 200 });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
