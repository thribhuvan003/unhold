import "server-only";

import { createHmac } from "crypto";
import { isIP } from "net";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError } from "@/lib/api/errors";

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
    limiter: Ratelimit.slidingWindow(5, "1 d"),
    prefix: "rl:guest:case_create",
  });
}

function getTransitionLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "rl:transitions",
  });
}

function getSwarmEventsReadLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "5 m"),
    prefix: "rl:swarm_events_read",
  });
}

function getNoticeAnalysisLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:notice_analysis",
  });
}

async function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
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

export async function enforceGuestCaseCreateLimit(
  identifier: string,
): Promise<void> {
  const limiter = getGuestCaseLimiter();
  if (limiter) {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Guest case creation limit exceeded (5/day)",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `guest_case:${identifier}`,
    5,
    24 * 60 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Guest case creation limit exceeded (5/day)",
    );
  }
}

/**
 * Per-case cap on Freeze Notice Analyzer runs. The analyzer makes a synchronous
 * NVIDIA call (not a queued agent_job), so it isn't covered by agent_cost_cap_usd;
 * this limiter is the cost/abuse control for that path.
 */
export async function enforceNoticeAnalysisLimit(
  caseId: string,
): Promise<void> {
  const limiter = getNoticeAnalysisLimiter();
  if (limiter) {
    const { success } = await limiter.limit(caseId);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Notice analysis limit exceeded (10/hour/case)",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `notice_analysis:${caseId}`,
    10,
    60 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Notice analysis limit exceeded (10/hour/case)",
    );
  }
}

export async function enforceTransitionRateLimit(
  caseId: string,
): Promise<void> {
  const limiter = getTransitionLimiter();
  if (limiter) {
    const { success } = await limiter.limit(caseId);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Transition rate limit exceeded (20/hour/case)",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `transition:${caseId}`,
    20,
    60 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Transition rate limit exceeded (20/hour/case)",
    );
  }
}

export async function enforceSwarmEventsReadLimit(
  caseId: string,
): Promise<void> {
  const limiter = getSwarmEventsReadLimiter();
  if (limiter) {
    const { success } = await limiter.limit(caseId);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Swarm events read limit exceeded (60/5min/case)",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `swarm_events_read:${caseId}`,
    60,
    5 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Swarm events read limit exceeded (60/5min/case)",
    );
  }
}

function getCaseRecoverLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "rl:case_recover",
  });
}

/** Strict cap on recovery attempts — keyed by IP (and optionally public_id). */
export async function enforceCaseRecoverLimit(
  identifier: string,
): Promise<void> {
  const limiter = getCaseRecoverLimiter();
  if (limiter) {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many recovery attempts. Try again later.",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `case_recover:${identifier}`,
    5,
    60 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many recovery attempts. Try again later.",
    );
  }
}

export function requireIdempotencyKey(request: Request): string {
  const key = request.headers.get("Idempotency-Key")?.trim();
  if (!key) {
    throw new ApiError(
      400,
      "validation_failed",
      "Idempotency-Key header is required",
    );
  }
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key,
    )
  ) {
    throw new ApiError(
      400,
      "validation_failed",
      "Idempotency-Key must be a UUID",
    );
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
    await redis.set(
      redisKey,
      { status: 0, body: "__pending__" },
      { ex: IDEMPOTENCY_TTL_SECONDS, nx: true },
    );
    const afterSet = await redis.get<IdempotencyRecord>(redisKey);
    if (afterSet && afterSet.body !== "__pending__") {
      return { replay: afterSet };
    }
    return { replay: null };
  }

  const memKey = `${scope}:${key}`;
  const existing = memoryIdempotency.get(memKey);
  if (existing) return { replay: existing };
  memoryIdempotency.set(memKey, { status: 0, body: "__pending__" });
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

export function parseIdempotentReplay(record: IdempotencyRecord): {
  status: number;
  body: unknown;
} {
  return {
    status: record.status,
    body: record.body === "__pending__" ? null : JSON.parse(record.body),
  };
}

/** Test helper */
export function resetRateLimitMemory(): void {
  memoryIdempotency.clear();
  memoryRateCounts.clear();
}

function getGuestSessionLimiter(): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "rl:guest:session_create",
  });
}

function fingerprintSecret(): string {
  const secret =
    process.env.RATE_LIMIT_FINGERPRINT_SECRET ?? process.env.GUEST_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "RATE_LIMIT_FINGERPRINT_SECRET or GUEST_JWT_SECRET must be at least 32 characters",
    );
  }
  return secret;
}

/** Returns an opaque stable key; raw network/device values are never stored. */
export function getClientRateLimitFingerprint(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim() ?? "";
  const forwardedIp =
    request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .map((value) => value.trim())
      .find((value) => isIP(value) !== 0) ?? "";
  const ip = isIP(realIp) !== 0 ? realIp : forwardedIp;
  const material = ip
    ? `ip:${ip}`
    : `client:${(request.headers.get("user-agent") ?? "unknown").slice(0, 256)}|${(
        request.headers.get("accept-language") ?? "unknown"
      ).slice(0, 128)}`;
  return createHmac("sha256", fingerprintSecret())
    .update(material)
    .digest("hex");
}

export async function enforceGuestSessionCreateLimit(
  identifier: string,
): Promise<void> {
  const limiter = getGuestSessionLimiter();
  if (limiter) {
    const { success } = await limiter.limit(identifier);
    if (!success) {
      throw new ApiError(
        429,
        "rate_limited",
        "Too many guest sessions. Try again later.",
      );
    }
    return;
  }

  const allowed = await memoryRateLimit(
    `guest_session:${identifier}`,
    10,
    60 * 60 * 1000,
  );
  if (!allowed) {
    throw new ApiError(
      429,
      "rate_limited",
      "Too many guest sessions. Try again later.",
    );
  }
}
