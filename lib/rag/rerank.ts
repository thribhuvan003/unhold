import 'server-only';

/**
 * Cross-encoder reranking via NVIDIA (nvidia/rerank-qa-mistral-4b).
 *
 * Vector search is recall-oriented (fast, approximate); a reranker is a
 * precision-oriented cross-encoder that scores each (query, passage) pair
 * jointly. Pattern: retrieve a wider candidate pool by embedding similarity,
 * then rerank and keep the top-k — a big retrieval-quality boost for grounding.
 *
 * Returns passage indices ordered best-first (≤ topK), or null on failure so
 * callers fall back to the original vector order. Reuses the NVIDIA key pool.
 */

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

const DEFAULT_RERANK_URL = 'https://ai.api.nvidia.com/v1/retrieval/nvidia/reranking';
const DEFAULT_RERANK_MODEL = 'nvidia/rerank-qa-mistral-4b';

export async function rerankPassages(
  query: string,
  passages: string[],
  topK = 5,
): Promise<number[] | null> {
  const keys = getNvidiaApiKeys();
  if (keys.length === 0 || passages.length === 0) return null;

  const url = process.env.NVIDIA_RERANK_URL ?? DEFAULT_RERANK_URL;
  const model = process.env.NVIDIA_RERANK_MODEL ?? DEFAULT_RERANK_MODEL;
  const body = JSON.stringify({
    model,
    query: { text: query },
    passages: passages.map((text) => ({ text })),
  });

  for (let attempt = 0; attempt < Math.min(keys.length, 3); attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${keys[attempt % keys.length]}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body,
      });

      if (response.ok) {
        const payload = (await response.json()) as { rankings?: Array<{ index: number }> };
        const order = (payload.rankings ?? []).map((r) => r.index);
        return order.length > 0 ? order.slice(0, topK) : null;
      }
      if (response.status === 429) continue;
      return null;
    } catch {
      // transient — try next key
    }
  }
  return null;
}
