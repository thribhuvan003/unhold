-- =============================================================================
-- LienLiberator — Migration 005: Evidence & Action Logs (append-only audit)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- evidence
-- ---------------------------------------------------------------------------
CREATE TABLE public.evidence (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  evidence_type         public.evidence_type NOT NULL,
  storage_path          TEXT NOT NULL,
  storage_bucket        TEXT NOT NULL DEFAULT 'evidence',
  original_filename     TEXT,
  mime_type             TEXT,
  file_size_bytes       BIGINT,
  sha256                TEXT NOT NULL,
  sha256_verified_at    TIMESTAMPTZ,
  vision_extracted_json JSONB NOT NULL DEFAULT '{}',
  vision_confidence     NUMERIC(4,3),
  human_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  human_verified_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  human_verified_at     TIMESTAMPTZ,
  forgery_flag          BOOLEAN NOT NULL DEFAULT FALSE,
  forgery_notes         TEXT,
  bundle_id             UUID,
  uploaded_by           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_session_id      UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  redaction_applied     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  deleted_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT evidence_sha256_format CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  CONSTRAINT evidence_file_size_nonneg CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
  CONSTRAINT evidence_vision_confidence_range CHECK (
    vision_confidence IS NULL OR vision_confidence BETWEEN 0 AND 1
  ),
  CONSTRAINT evidence_uploader_required CHECK (
    uploaded_by IS NOT NULL OR guest_session_id IS NOT NULL
  )
);

COMMENT ON TABLE public.evidence IS 'Uploaded files with SHA-256 manifest; soft-delete for erasure';
COMMENT ON COLUMN public.evidence.storage_path IS 'Supabase Storage path: {case_id}/{evidence_id}/{filename}';
COMMENT ON COLUMN public.evidence.sha256 IS 'Client-computed hash verified server-side on confirm';
COMMENT ON COLUMN public.evidence.vision_extracted_json IS 'OCR output: amount, date, narration_code, bank_name';
COMMENT ON COLUMN public.evidence.bundle_id IS 'Set when included in evidence PDF/ZIP bundle';
COMMENT ON COLUMN public.evidence.deleted_at IS 'Soft delete for DPDP erasure; storage object purged async';

CREATE INDEX idx_evidence_case_id ON public.evidence (case_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_evidence_case_type ON public.evidence (case_id, evidence_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_evidence_sha256 ON public.evidence (sha256);
CREATE INDEX idx_evidence_bundle ON public.evidence (bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX idx_evidence_forgery ON public.evidence (case_id) WHERE forgery_flag = TRUE AND deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- action_logs (IMMUTABLE — no UPDATE/DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE public.action_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES public.cases(id) ON DELETE RESTRICT,
  actor_type    public.actor_type NOT NULL,
  actor_id      TEXT,
  action        TEXT NOT NULL,
  payload_json  JSONB NOT NULL DEFAULT '{}',
  ip_hash       TEXT,
  request_id    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.action_logs IS 'Append-only audit trail; 8-year retention T5';
COMMENT ON COLUMN public.action_logs.actor_id IS 'user UUID, guest_session UUID, agent job id, or system label';
COMMENT ON COLUMN public.action_logs.action IS 'e.g. case.created, transition.intake_scoping, escalation.mark_sent';
COMMENT ON COLUMN public.action_logs.payload_json IS 'Redacted transition details, no raw PII';

CREATE INDEX idx_action_logs_case_created ON public.action_logs (case_id, created_at DESC);
CREATE INDEX idx_action_logs_action ON public.action_logs (action, created_at DESC);
CREATE INDEX idx_action_logs_created ON public.action_logs (created_at DESC);

-- Immutability enforcement
CREATE OR REPLACE FUNCTION public.deny_action_logs_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'action_logs is append-only; % not permitted', TG_OP;
END;
$$;

CREATE TRIGGER trg_action_logs_no_update
  BEFORE UPDATE ON public.action_logs
  FOR EACH ROW EXECUTE FUNCTION public.deny_action_logs_mutation();

CREATE TRIGGER trg_action_logs_no_delete
  BEFORE DELETE ON public.action_logs
  FOR EACH ROW EXECUTE FUNCTION public.deny_action_logs_mutation();