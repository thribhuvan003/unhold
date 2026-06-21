import 'server-only';

import { acquireCronLock } from '@/lib/loops/locks';
import { ApiError } from '@/lib/api/errors';

function floorTo15MinBucket(d: Date): string {
  const t = new Date(d);
  t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 15) * 15, 0, 0);
  return t.toISOString().slice(0, 16);
}

function dayBucketIst(d: Date): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/**
 * Bearer auth for internal cron/job routes (Response envelope).
 * @see docs/BUILD_SPEC_LOOPS.md §6.1
 */
export function assertCronAuth(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'cron_secret_not_configured' }, { status: 500 });
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  return null;
}

/**
 * Bearer CRON_SECRET (throws ApiError for route handlers).
 */
export function assertCronBearer(request: Request): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    throw new ApiError(500, 'internal_error', 'CRON_SECRET not configured');
  }

  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    throw new ApiError(401, 'unauthorized', 'Invalid cron authorization');
  }
}

/**
 * Bearer CRON_SECRET + Redis mutex for internal cron routes.
 */
export async function authorizeCronJob(
  request: Request,
  cronName: string,
  options?: { bucket?: string; lockTtlSeconds?: number },
): Promise<{ bucket: string; lockAcquired: boolean }> {
  assertCronBearer(request);

  const bucket =
    options?.bucket ??
    (cronName === 'reminders' ? dayBucketIst(new Date()) : floorTo15MinBucket(new Date()));

  const lockAcquired = await acquireCronLock(
    cronName,
    bucket,
    options?.lockTtlSeconds ?? 840,
  );

  return { bucket, lockAcquired };
}