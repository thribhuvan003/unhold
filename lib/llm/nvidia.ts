import 'server-only';

export type LlmContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type LlmMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | LlmContentPart[];
};

export type NvidiaChatOptions = {
  model?: string;
  messages: LlmMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  /** OpenAI-compatible JSON mode — forces syntactically valid JSON output. */
  response_format?: { type: 'json_object' };
};

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DEFAULT_MODEL = 'minimaxai/minimax-m3';

/** In-memory round-robin index + temporary bad-key tracker (per function instance) */
let rrIndex = 0;
const badKeysUntil = new Map<string, number>(); // key -> timestamp until which it is skipped

/**
 * Collects NVIDIA API keys for rotation.
 * Supports multiple free-tier keys (nvapi-*) to mitigate ~40 RPM limits per key.
 *
 * Research-backed (as of 2026):
 * - Free tier MiniMax-M3 / similar NIM models: ~40 requests per minute per key (NVIDIA forums Apr-May 2026 reports).
 * - Multiple keys is the standard workaround since rate limit increases are not granted on free tier.
 * - Recommended patterns: round-robin + immediate failover on 429 (see Gemini key rotators, serverless load-balancing papers 2025-2026).
 * - Random/RR without coordination is preferred in serverless (Vercel/Next.js) to avoid thundering herd.
 *
 * Usage:
 *   NVIDIA_API_KEYS=nvapi-key1,nvapi-key2,nvapi-key3
 *
 * Falls back gracefully to single key.
 */
export function getNvidiaApiKeys(): string[] {
  const multi = process.env.NVIDIA_API_KEYS;
  if (multi && multi.trim()) {
    return multi
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }

  const single =
    process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? null;
  return single ? [single] : [];
}

/**
 * Picks a key using round-robin base with smart 429-aware rotation.
 * Efficient: O(1) amortized, at most pool-size attempts on rate limit.
 */
function resolveApiKey(): string | null {
  const keys = getNvidiaApiKeys();
  if (keys.length === 0) return null;

  const now = Date.now();

  // Expire old bad keys (60s cooldown after 429)
  for (const [k, until] of badKeysUntil) {
    if (until < now) badKeysUntil.delete(k);
  }

  // Prefer non-bad keys, fall back to any
  const healthy = keys.filter((k) => !badKeysUntil.has(k));
  const pool = healthy.length > 0 ? healthy : keys;

  const key = pool[rrIndex % pool.length];
  rrIndex = (rrIndex + 1) % Math.max(1, pool.length);
  return key;
}

function resolveBaseUrl(): string {
  return process.env.NVIDIA_API_BASE_URL ?? DEFAULT_BASE_URL;
}

function resolveModel(override?: string): string {
  return override ?? process.env.NVIDIA_MODEL ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
}

/** Strip markdown JSON fences if the model wraps output. */
export function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();
  return trimmed;
}

/**
 * OpenAI-compatible chat completions via NVIDIA Integrate API.
 *
 * Supports multiple free-tier `nvapi-` keys via NVIDIA_API_KEYS (comma/space separated)
 * for rotation across INTAKE / DRAFTER / VERIFIER agents.
 *
 * MiniMax-M3 is multimodal: pass content as array with {type: "image_url"} parts.
 *
 * @see https://integrate.api.nvidia.com/v1/chat/completions
 */
export async function nvidiaChatCompletion(
  options: NvidiaChatOptions,
): Promise<string | null> {
  const allKeys = getNvidiaApiKeys();
  if (allKeys.length === 0) return null;

  const baseUrl = resolveBaseUrl();
  const model = resolveModel(options.model);
  const body = JSON.stringify({
    model,
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    max_tokens: options.max_tokens ?? 8192,
    temperature: options.temperature ?? 1,
    top_p: options.top_p ?? 0.95,
    stream: false,
    ...(options.response_format ? { response_format: options.response_format } : {}),
  });

  const maxAttempts = Math.min(allKeys.length, 5); // hard cap for efficiency
  let lastStatus = 0;
  let lastDetail = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = resolveApiKey();
    if (!apiKey) break;

    try {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          choices?: Array<{ message?: { content?: string | null } }>;
        };
        const content = payload.choices?.[0]?.message?.content;
        return typeof content === 'string' ? content : null;
      }

      lastStatus = response.status;
      lastDetail = await response.text().catch(() => '');

      if (lastStatus === 429) {
        // Research-backed: mark this key bad for ~60s (matches reported free-tier behavior)
        badKeysUntil.set(apiKey, Date.now() + 60_000);
        // Small jittered backoff (proven to reduce thundering herd)
        const jitter = 30 + Math.random() * 120;
        await new Promise((r) => setTimeout(r, jitter));
        continue; // immediately try next key from pool
      }

      // Non-429 error (auth, model, etc.) — don't waste other keys
      console.error('[nvidia-llm] request failed', lastStatus, lastDetail.slice(0, 500));
      return null;
    } catch (err) {
      lastDetail = String(err);
      // Transient network error — rotate once
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 50));
        continue;
      }
    }
  }

  console.error('[nvidia-llm] exhausted key pool or persistent error', lastStatus, lastDetail.slice(0, 300));
  return null;
}

export function isNvidiaLlmConfigured(): boolean {
  return getNvidiaApiKeys().length > 0;
}

/** Returns how many NVIDIA keys are configured (useful for logging / monitoring rotation). */
export function getNvidiaKeyCount(): number {
  return getNvidiaApiKeys().length;
}

/**
 * Returns approximate number of currently healthy (non-429-cooldown) keys.
 * Useful for observability.
 */
export function getHealthyNvidiaKeyCount(): number {
  const now = Date.now();
  const keys = getNvidiaApiKeys();
  return keys.filter((k) => (badKeysUntil.get(k) ?? 0) < now).length;
}