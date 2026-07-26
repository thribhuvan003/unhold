import type { NextRequest } from 'next/server';
import { authorizeCronJob } from '@/lib/api/cron-auth';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { runBatchCaseTicks } from '@/lib/loops/case-tick';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { bucket, lockAcquired } = await authorizeCronJob(request, 'tick');

    if (!lockAcquired) {
      return jsonSuccess({ skipped: true, reason: 'concurrent_cron', bucket, request_id: requestId });
    }

    const result = await runBatchCaseTicks({ limit: 50, trigger: { type: 'cron' } });
    return jsonSuccess({
      bucket,
      processed: result.processed,
      results: result.results,
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}

export const GET = POST;
