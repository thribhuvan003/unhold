-- 013_rag_embeddings_1024.sql
-- Make the RAG knowledge base real:
--  * switch embeddings to 1024 dims (NVIDIA nv-embedqa-e5-v5)
--  * add provenance/quality metadata so the drafter can cite + grade sources
--  * add a cosine match RPC for retrieval
-- The table is empty before ingestion, so recreating the embedding column is safe.

-- 1024-dim embedding (was a placeholder 1536).
ALTER TABLE public.knowledge_chunks DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.knowledge_chunks ADD COLUMN embedding vector(1024);

-- Provenance / quality metadata (mirrors docs/RESEARCH_FREEZE_DOMAIN.md tagging).
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS chunk_key text UNIQUE;
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS source_type text;   -- regulator|court|bank_official|legal_secondary|consumer_press|community_anecdote|internal
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS confidence text;    -- high|med|low
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS currency text;      -- current|verify|superseded
ALTER TABLE public.knowledge_chunks ADD COLUMN IF NOT EXISTS intended_use text[] DEFAULT '{}';

-- ivfflat cosine index (small corpus; lists kept low).
DROP INDEX IF EXISTS knowledge_chunks_embedding_idx;
CREATE INDEX knowledge_chunks_embedding_idx
  ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Cosine similarity retrieval. Called server-side via the admin (service-role) client.
CREATE OR REPLACE FUNCTION public.match_knowledge_chunks(
  query_embedding vector(1024),
  match_count int DEFAULT 5
) RETURNS TABLE (
  id uuid,
  chunk_key text,
  title text,
  content text,
  source text,
  source_url text,
  source_type text,
  confidence text,
  currency text,
  tags text[],
  intended_use text[],
  similarity float
) LANGUAGE sql STABLE AS $$
  SELECT kc.id, kc.chunk_key, kc.title, kc.content, kc.source, kc.source_url,
         kc.source_type, kc.confidence, kc.currency, kc.tags, kc.intended_use,
         1 - (kc.embedding <=> query_embedding) AS similarity
  FROM public.knowledge_chunks kc
  WHERE kc.embedding IS NOT NULL
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
$$;
