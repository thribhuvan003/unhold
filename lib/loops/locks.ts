import 'server-only';

import { Redis } from '@upstash/redis';

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/**
 * Per-case inner-loop mutex. Prevents concurrent monitor ticks.
 * When Redis is unavailable (local dev), locks are permissive (always acquire).
 */
export async function acquireCaseTickLock(caseId: string, ttlSeconds: number): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const key = `case_tick:${caseId}`;
  const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
  return result === 'OK';
}

export async function releaseCaseTickLock(caseId: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.del(`case_tick:${caseId}`);
}

/**
 * Cron batch mutex — one tick invocation per 15-min bucket.
 */
export async function acquireCronLock(
  cronName: string,
  bucket: string,
  ttlSeconds: number,
): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  const key = `cron:${cronName}:${bucket}`;
  const result = await redis.set(key, '1', { nx: true, ex: ttlSeconds });
  return result === 'OK';
}