-- 012_add_vector_knowledge.sql
-- Add pgvector for GRM/MRM RAG knowledge base.
-- Run after previous migrations.

CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base for official processes, templates, judgments.
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  source text,
  tags text[] DEFAULT '{}',
  embedding vector(1536),  -- Adjust dim based on embedding model (e.g. 1536 for many)
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.knowledge_chunks IS 'Curated GRM/MRM guidelines, successful representations, processes for RAG in Unhold.';

-- Simple index for vector similarity.
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_idx ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops);

-- Seed some core chunks (expand in prod with real docs).
-- In code, we will embed and insert via migration or admin script.
