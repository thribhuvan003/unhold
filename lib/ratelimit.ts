import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ApiError } from '@/lib/api/errors';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

type IdempotencyRecord = {
  status: number;
  body: string;
};

const memoryIdempotency = new Map<string, IdempotencyRecord>();
const memoryRateCounts = new Map<string, { count: number; resetAt: number }>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function getGuestCaseLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 d'),
    prefix: 'rl:guest:case_create',
  });
}

function getTransitionLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 h'),
    prefix: 'rl:transitions',
  });
}

function getSwarmEventsReadLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '5 m'),
    prefix: 'rl:swarm_events_read',
  });
}

async function memoryRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const entry = memoryRateCounts.get(key);
  if (!entry || entry.resetAt <= now) {
    memoryRateCounts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

export async function enforceGuestCaseCreateLimit(identifier: string): Promise<void> {
  const limiter = getGuestCaseLimiter();
  if (limiter) {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      throw new ApiError(429, 'rate_limited', 'Guest case creation limit exceeded (5/day)');
    }
    return;
  }

  const allowed = await memoryRateLimit(`guest_case:${identifier}`, 5, 24 * 60 * 60 * 1000);
  if (!allowed) {
    throw new ApiError(429, 'rate_limited', 'Guest case creation limit exceeded (5/day)');
  }
}

export async function enforceTransitionRateLimit(caseId: string): Promise<void> {
  const limiter = getTransitionLimiter();
  if (limiter) {
    const { success } = await limiter.limit(caseId);
    if (!success) {
      throw new ApiError(429, 'rate_limited', 'Transition rate limit exceeded (20/hour/case)');
    }
    return;
  }

  const allowed = await memoryRateLimit(`transition:${caseId}`, 20, 60 * 60 * 1000);
  if (!allowed) {
    throw new ApiError(429, 'rate_limited', 'Transition rate limit exceeded (20/hour/case)');
  }
}

export async function enforceSwarmEventsReadLimit(caseId: string): Promise<void> {
  const limiter = getSwarmEventsReadLimiter();
  if (limiter) {
    const { success } = await limiter.limit(caseId);
    if (!success) {
      throw new ApiError(429, 'rate_limited', 'Swarm events read limit exceeded (60/5min/case)');
    }
    return;
  }

  const allowed = await memoryRateLimit(`swarm_events_read:${caseId}`, 60, 5 * 60 * 1000);
  if (!allowed) {
    throw new ApiError(429, 'rate_limited', 'Swarm events read limit exceeded (60/5min/case)');
  }
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get('Idempotency-Key')?.trim();
  if (!key) {
    throw new ApiError(400, 'validation_failed', 'Idempotency-Key header is required');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw new ApiError(400, 'validation_failed', 'Idempotency-Key must be a UUID');
  }
  return key;
}

export async function beginIdempotentRequest(
  scope: string,
  key: string,
): Promise<{ replay: IdempotencyRecord | null }> {
  const redis = getRedis();
  const redisKey = `idem:${scope}:${key}`;

  if (redis) {
    const existing = await redis.get<IdempotencyRecord>(redisKey);
    if (existing) return { replay: existing };
    await redis.set(redisKey, { status: 0, body: '__pending__' }, { ex: IDEMPOTENCY_TTL_SECONDS, nx: true });
    const afterSet = await redis.get<IdempotencyRecord>(redisKey);
    if (afterSet && afterSet.body !== '__pending__') {
      return { replay: afterSet };
    }
    return { replay: null };
  }

  const memKey = `${scope}:${key}`;
  const existing = memoryIdempotency.get(memKey);
  if (existing) return { replay: existing };
  memoryIdempotency.set(memKey, { status: 0, body: '__pending__' });
  return { replay: null };
}

export async function completeIdempotentRequest(
  scope: string,
  key: string,
  status: number,
  body: unknown,
): Promise<void> {
  const record: IdempotencyRecord = { status, body: JSON.stringify(body) };
  const redis = getRedis();
  const redisKey = `idem:${scope}:${key}`;

  if (redis) {
    await redis.set(redisKey, record, { ex: IDEMPOTENCY_TTL_SECONDS });
    return;
  }

  memoryIdempotency.set(`${scope}:${key}`, record);
}

export function parseIdempotentReplay(record: IdempotencyRecord): { status: number; body: unknown } {
  return {
    status: record.status,
    body: record.body === '__pending__' ? null : JSON.parse(record.body),
  };
}

/** Test helper */
export function resetRateLimitMemory(): void {
  memoryIdempotency.clear();
  memoryRateCounts.clear();
}