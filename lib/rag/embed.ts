import 'server-only';

/** NVIDIA key pool (comma/space separated), mirroring lib/llm/nvidia.ts. */
function getNvidiaApiKeys(): string[] {
  const multi = process.env.NVIDIA_API_KEYS;
  if (multi && multi.trim()) {
    return multi
      .split(/[\s,]+/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  const single = process.env.NVIDIA_API_KEY ?? process.env.NVIDIA_NIM_API_KEY ?? null;
  return single ? [single] : [];
}

/**
 * Text embeddings via NVIDIA Integrate (OpenAI-compatible /v1/embeddings).
 *
 * Model: nvidia/nv-embedqa-e5-v5 → 1024-dim vectors (matches migration 013).
 * nv-embedqa requires `input_type`: use 'passage' when embedding documents to
 * store, 'query' when embedding a search query. Reuses the NVIDIA key pool
 * (NVIDIA_API_KEYS) with simple 429-aware rotation, mirroring lib/llm/nvidia.ts.
 *
 * Returns null when no key is configured or the call fails — callers fall back
 * to keyword retrieval, so embedding outages never hard-error the app.
 */

export const EMBED_DIM = 1024;

/** Hang protection: the embeddings endpoint occasionally stalls; without a
 * timeout a single slow call blocks the whole request that awaits retrieval. */
const EMBED_TIMEOUT_MS = 8000;

const DEFAULT_EMBED_URL = 'https://integrate.api.nvidia.com/v1/embeddings';
const DEFAULT_EMBED_MODEL = 'nvidia/nv-embedqa-e5-v5';

function embedUrl(): string {
  return process.env.NVIDIA_EMBED_BASE_URL ?? DEFAULT_EMBED_URL;
}

function embedModel(): string {
  return process.env.NVIDIA_EMBED_MODEL ?? DEFAULT_EMBED_MODEL;
}

export async function embedText(
  text: string,
  inputType: 'query' | 'passage' = 'query',
): Promise<number[] | null> {
  const keys = getNvidiaApiKeys();
  if (keys.length === 0) return null;

  const body = JSON.stringify({
    input: [text],
    model: embedModel(),
    input_type: inputType,
    encoding_format: 'float',
    truncate: 'END',
  });

  const maxAttempts = Math.min(keys.length, 5);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = keys[attempt % keys.length];
    try {
      const response = await fetch(embedUrl(), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
        signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
      });

      if (response.ok) {
        const payload = (await response.json()) as {
          data?: Array<{ embedding?: number[] }>;
        };
        const embedding = payload.data?.[0]?.embedding;
        return Array.isArray(embedding) ? embedding : null;
      }

      // Rotate to the next key on rate limit; bail on other errors.
      if (response.status === 429) continue;
      console.error('[nvidia-embed] failed', response.status);
      return null;
    } catch (err) {
      // Timeout means the endpoint is slow/hung, not rate-limited — a different
      // key won't help, so bail instead of stacking more timeouts.
      if (err instanceof Error && err.name === 'TimeoutError') return null;
      // transient — try the next key
    }
  }
  return null;
}
