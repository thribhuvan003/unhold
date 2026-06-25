// lib/rag/retrieve.ts
// GRM-aware retrieval. Real pgvector path (NVIDIA embeddings + match RPC) with a
// keyword fallback over the in-code bootstrap chunks when embeddings/DB are
// unavailable — so retrieval degrades gracefully, never hard-errors.
import 'server-only';

import { retrieveGrKnowledge, type GrKnowledgeChunk } from './grm-knowledge';
import { embedText } from './embed';
import { createAdminClient } from '@/lib/supabase/admin';

export type RetrievedChunk = GrKnowledgeChunk & {
  similarity?: number;
  source_url?: string;
  source_type?: string;
  confidence?: string; // high|med|low
  currency?: string; // current|verify|superseded
  intended_use?: string[];
};

type MatchRow = {
  id: string;
  chunk_key: string | null;
  title: string;
  content: string;
  source: string | null;
  source_url: string | null;
  source_type: string | null;
  confidence: string | null;
  currency: string | null;
  tags: string[] | null;
  intended_use: string[] | null;
  similarity: number;
};

/**
 * Retrieve the most relevant knowledge chunks for `query`.
 * 1. Embed the query (NVIDIA, input_type=query) and cosine-match in pgvector.
 * 2. Fall back to keyword matching over the in-code corpus if embeddings or the
 *    DB are unavailable, or nothing matched.
 */
export async function retrieveRelevantContext(query: string, max = 4): Promise<RetrievedChunk[]> {
  const embedding = await embedText(query, 'query');

  if (embedding) {
    try {
      const admin = createAdminClient();
      // match_knowledge_chunks (migration 013) isn't in the generated DB types yet;
      // cast the rpc call rather than regenerate types for one function.
      const rpc = admin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ data: MatchRow[] | null; error: unknown }>;
      const { data, error } = await rpc('match_knowledge_chunks', {
        query_embedding: `[${embedding.join(',')}]`,
        match_count: max,
      });

      if (!error && Array.isArray(data) && data.length > 0) {
        return (data as MatchRow[]).map((d) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          source: d.source ?? '',
          tags: d.tags ?? [],
          source_url: d.source_url ?? undefined,
          source_type: d.source_type ?? undefined,
          confidence: d.confidence ?? undefined,
          currency: d.currency ?? undefined,
          intended_use: d.intended_use ?? undefined,
          similarity: d.similarity,
        }));
      }
    } catch {
      // fall through to keyword retrieval
    }
  }

  return retrieveGrKnowledge(query, max);
}
