-- =============================================================================
-- LienLiberator — Migration 011: Notice Analysis (Freeze Notice Analyzer P0)
-- Advisory AI analysis of an uploaded/pasted freeze notice. Append-only by RLS
-- (new row per re-run); NOT a hard-immutable audit log — rows cascade-delete
-- with the case for DPDP erasure (HG-2). Never drives a state transition.
-- @see .claude/session/notice-analyzer/plan.md
-- =============================================================================

CREATE TYPE public.notice_severity AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);
COMMENT ON TYPE public.notice_severity IS 'Advisory severity surfaced to the user; not a case-state value';

CREATE TABLE public.notice_analysis (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  input_kind             TEXT NOT NULL,
  evidence_id            UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  freeze_reason          public.freeze_reason NOT NULL,
  severity               public.notice_severity NOT NULL,
  confidence             NUMERIC(4,3) NOT NULL,
  plain_english          TEXT NOT NULL,
  what_this_means        TEXT NOT NULL,
  suggested_next         TEXT[] NOT NULL DEFAULT '{}',
  extracted_amount_paise BIGINT,
  extracted_date         DATE,
  extracted_reference    TEXT,
  extracted_bank_id      UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  raw_output_json        JSONB NOT NULL DEFAULT '{}',
  agent_job_id           UUID REFERENCES public.agent_jobs(id) ON DELETE SET NULL,
  human_review_required  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT notice_analysis_input_kind CHECK (input_kind IN ('image', 'text')),
  CONSTRAINT notice_analysis_confidence_range CHECK (confidence BETWEEN 0 AND 1),
  CONSTRAINT notice_analysis_amount_nonneg CHECK (
    extracted_amount_paise IS NULL OR extracted_amount_paise >= 0
  )
);

COMMENT ON TABLE public.notice_analysis IS 'Advisory AI freeze-notice analysis; append-only via RLS, erasable with case';
COMMENT ON COLUMN public.notice_analysis.input_kind IS 'image (vision OCR) or text (pasted notice, no OCR)';
COMMENT ON COLUMN public.notice_analysis.extracted_reference IS 'NCRP/FIR/notice reference as printed; PII redacted before store';
COMMENT ON COLUMN public.notice_analysis.raw_output_json IS 'Full validated model output; account/Aadhaar/PAN masked at app layer';

CREATE INDEX idx_notice_analysis_case_created ON public.notice_analysis (case_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS — mirrors evidence: guest/owner SELECT + INSERT via has_case_access.
-- No UPDATE/DELETE policy => denied for all non-bypass roles (append-only).
-- Erasure happens via ON DELETE CASCADE when the parent case is purged.
-- ---------------------------------------------------------------------------
ALTER TABLE public.notice_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notice_analysis FORCE ROW LEVEL SECURITY;

CREATE POLICY notice_analysis_select_access ON public.notice_analysis
  FOR SELECT TO anon, authenticated
  USING (public.has_case_access(case_id, 'viewer'));

CREATE POLICY notice_analysis_insert_editor ON public.notice_analysis
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.has_case_access(case_id, 'editor'));
