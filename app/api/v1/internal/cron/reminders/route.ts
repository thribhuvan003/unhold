import type { NextRequest } from 'next/server';
import { authorizeCronJob } from '@/lib/api/cron-auth';
import { runReminderBatch } from '@/lib/agents/monitor/runner';
import { runEmailDeadlineReminderBatch } from '@/lib/email/send';
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
    // Also email opted-in users whose case action deadline has lapsed.
    // Idempotent per deadline; only ever emails the user about their own case.
    const emailReminders = await runEmailDeadlineReminderBatch({ limit: 100 });
    return jsonSuccess({
      bucket,
      ...result,
      email_reminders: emailReminders,
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}