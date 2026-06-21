import 'server-only';

import { Redis } from '@upstash/redis';

const API_IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export type IdempotencyClaimResult =
  | { status: 'new'; key: string }
  | { status: 'replay'; key: string; cached_response?: string }
  | { status: 'in_progress'; key: string };

/**
 * API-level idempotency for POST mutations (transitions, mark-sent, cases).
 * Redis 24h TTL per BUILD_SPEC_LOOPS.md §8.1
 */
export async function claimIdempotencyKey(
  scope: string,
  key: string,
): Promise<IdempotencyClaimResult> {
  const redis = getRedis();
  const fullKey = `idem:${scope}:${key}`;

  if (!redis) {
    return { status: 'new', key: fullKey };
  }

  const existing = await redis.get<string>(fullKey);
  if (existing === 'in_progress') {
    return { status: 'in_progress', key: fullKey };
  }
  if (existing && existing !== 'in_progress') {
    return { status: 'replay', key: fullKey, cached_response: existing };
  }

  const set = await redis.set(fullKey, 'in_progress', { nx: true, ex: API_IDEMPOTENCY_TTL_SECONDS });
  if (set !== 'OK') {
    const again = await redis.get<string>(fullKey);
    if (again && again !== 'in_progress') {
      return { status: 'replay', key: fullKey, cached_response: again };
    }
    return { status: 'in_progress', key: fullKey };
  }

  return { status: 'new', key: fullKey };
}

export async function completeIdempotencyKey(
  scope: string,
  key: string,
  responseJson: string,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(`idem:${scope}:${key}`, responseJson, { ex: API_IDEMPOTENCY_TTL_SECONDS });
}