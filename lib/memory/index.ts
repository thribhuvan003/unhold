import 'server-only';

import Supermemory from 'supermemory';

/**
 * Persistent long-term memory for Unhold, backed by Supermemory.
 *
 * Everything is scoped to a stable `containerTag` so this project's memory stays
 * isolated from other projects. In this repo the tag is always `lienliberator`
 * (see docs/SUPERMEMORY.md) — pass the default unless you have a reason not to.
 *
 * Backend: the SDK reads SUPERMEMORY_API_KEY (cloud, https://api.supermemory.ai)
 * and an optional SUPERMEMORY_BASE_URL (e.g. a local `npx supermemory local`
 * server) straight from the environment. If no key is set, memory is disabled
 * and every call degrades gracefully to a no-op — the app never hard-errors on
 * a missing key, mirroring the rate-limit / NVIDIA fallbacks.
 *
 * NEVER store secrets, full Aadhaar/PAN/account numbers, or other PII here — the
 * same redaction rules that apply to LLM prompts apply to memory.
 */

export const MEMORY_CONTAINER_TAG = 'lienliberator';

// `undefined` = not yet resolved, `null` = resolved-but-disabled (no key).
let client: Supermemory | null | undefined;

function getClient(): Supermemory | null {
  if (client !== undefined) return client;

  const apiKey = process.env.SUPERMEMORY_API_KEY?.trim();
  if (!apiKey) {
    client = null;
    return null;
  }

  // apiKey + optional baseURL are read from the environment by the SDK.
  client = new Supermemory();
  return client;
}

/** Whether a Supermemory key is configured. When false, all calls are no-ops. */
export function memoryEnabled(): boolean {
  return getClient() !== null;
}

/**
 * Persist one durable fact. Returns the created document id, or `null` when
 * memory is disabled. Write one clear fact per call (see docs/SUPERMEMORY.md).
 */
export async function remember(
  content: string,
  containerTag: string = MEMORY_CONTAINER_TAG,
): Promise<string | null> {
  const c = getClient();
  if (!c) return null;
  const doc = await c.documents.add({ content, containerTag });
  return doc.id;
}

/**
 * Retrieve the most relevant remembered snippets for `query`. Returns an empty
 * array when memory is disabled or nothing matches.
 */
export async function recall(
  query: string,
  { containerTag = MEMORY_CONTAINER_TAG, limit = 5 }: { containerTag?: string; limit?: number } = {},
): Promise<string[]> {
  const c = getClient();
  if (!c) return [];

  const response = await c.search.execute({ q: query, containerTag, limit });
  const snippets: string[] = [];
  for (const result of response.results ?? []) {
    for (const chunk of result.chunks ?? []) {
      if (chunk?.content) snippets.push(chunk.content);
    }
  }
  return snippets;
}

/** Recalled snippets formatted for injection into a prompt; '' when none. */
export async function buildContext(
  query: string,
  opts?: { containerTag?: string; limit?: number },
): Promise<string> {
  const snippets = await recall(query, opts);
  if (snippets.length === 0) return '';
  return `Relevant memory:\n${snippets.map((s) => `- ${s}`).join('\n')}`;
}
