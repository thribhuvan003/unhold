import type { NextRequest } from 'next/server';
import { authorizeCronJob } from '@/lib/api/cron-auth';
import { runReminderBatch } from '@/lib/agents/monitor/runner';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const { bucket, lockAcquired } = await authorizeCronJob(request, 'reminders', {
      lockTtlSeconds: 3600,
    });

    if (!lockAcquired) {
      return jsonSuccess({ skipped: true, reason: 'concurrent_cron', bucket, request_id: requestId });
    }

    const result = await runReminderBatch({ limit: 100 });
    return jsonSuccess({
      bucket,
      ...result,
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}