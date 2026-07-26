#!/usr/bin/env node
// scripts/rag/ingest.mjs
// Embed the curated corpus (corpus.mjs) with NVIDIA nv-embedqa-e5-v5 and upsert
// into public.knowledge_chunks (cosine RAG). Idempotent on chunk_key.
//
//   node --env-file=.env.local scripts/rag/ingest.mjs
//
// Needs: NVIDIA_API_KEYS (or NVIDIA_API_KEY), NEXT_PUBLIC_SUPABASE_URL,
//        SUPABASE_SERVICE_ROLE_KEY. Apply migration 013 first.
import { CORPUS } from './corpus.mjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMBED_URL = process.env.NVIDIA_EMBED_BASE_URL ?? 'https://integrate.api.nvidia.com/v1/embeddings';
const EMBED_MODEL = process.env.NVIDIA_EMBED_MODEL ?? 'nvidia/nv-embedqa-e5-v5';

const keys = (process.env.NVIDIA_API_KEYS ?? process.env.NVIDIA_API_KEY ?? '')
  .split(/[\s,]+/)
  .map((k) => k.trim())
  .filter(Boolean);

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (keys.length === 0) {
  console.error('Missing NVIDIA_API_KEYS / NVIDIA_API_KEY');
  process.exit(1);
}

let rr = 0;
async function embedPassage(text) {
  const body = JSON.stringify({
    input: [text],
    model: EMBED_MODEL,
    input_type: 'passage',
    encoding_format: 'float',
    truncate: 'END',
  });
  for (let attempt = 0; attempt < Math.min(keys.length, 5) + 1; attempt++) {
    const key = keys[rr++ % keys.length];
    const r = await fetch(EMBED_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      body,
    });
    if (r.ok) {
      const j = await r.json();
      const emb = j?.data?.[0]?.embedding;
      if (Array.isArray(emb)) return emb;
      throw new Error('no embedding in response');
    }
    if (r.status === 429) {
      await new Promise((res) => setTimeout(res, 400));
      continue;
    }
    throw new Error(`embed failed ${r.status}: ${(await r.text()).slice(0, 160)}`);
  }
  throw new Error('embed: key pool exhausted (429)');
}

async function upsert(rows) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_chunks?on_conflict=chunk_key`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!r.ok) throw new Error(`upsert failed ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

const rows = [];
for (const c of CORPUS) {
  const emb = await embedPassage(`${c.title}\n${c.content}`);
  rows.push({
    chunk_key: c.key,
    title: c.title,
    content: c.content,
    source: c.source ?? null,
    source_url: c.source_url || null,
    source_type: c.source_type ?? null,
    confidence: c.confidence ?? null,
    currency: c.currency ?? null,
    tags: c.tags ?? [],
    intended_use: c.intended_use ?? [],
    embedding: `[${emb.join(',')}]`,
  });
  console.log(`embedded  ${c.key.padEnd(28)} dim=${emb.length}`);
}

await upsert(rows);
console.log(`\nUpserted ${rows.length} knowledge_chunks.`);
