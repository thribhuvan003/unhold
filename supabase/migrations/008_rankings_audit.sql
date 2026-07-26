-- =============================================================================
-- LienLiberator — Migration 008: Rankings, Disputes, Audit Seals
-- =============================================================================

-- ---------------------------------------------------------------------------
-- bank_scores (aggregated ranking snapshots)
-- ---------------------------------------------------------------------------
CREATE TABLE public.bank_scores (
  id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id                       UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  snapshot_date                 DATE NOT NULL DEFAULT CURRENT_DATE,
  methodology_version           TEXT NOT NULL DEFAULT 'v1',
  sample_size                   INTEGER NOT NULL DEFAULT 0,
  cases_reported                INTEGER NOT NULL DEFAULT 0,
  cases_open                    INTEGER NOT NULL DEFAULT 0,
  cases_resolved                INTEGER NOT NULL DEFAULT 0,
  cases_resolved_positive       INTEGER NOT NULL DEFAULT 0,
  median_days_full_unfreeze     NUMERIC(8,2),
  innocent_receiver_release_rate NUMERIC(5,4),
  avg_satisfaction              NUMERIC(3,2),
  ombudsman_filings             INTEGER NOT NULL DEFAULT 0,
  pressure_score                NUMERIC(5,2),
  is_public                     BOOLEAN NOT NULL DEFAULT FALSE,
  metrics_json                  JSONB NOT NULL DEFAULT '{}',
  computed_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bank_scores_unique_snapshot UNIQUE (bank_id, snapshot_date, methodology_version),
  CONSTRAINT bank_scores_sample_nonneg CHECK (sample_size >= 0),
  CONSTRAINT bank_scores_pressure_range CHECK (pressure_score IS NULL OR pressure_score BETWEEN 0 AND 100),
  CONSTRAINT bank_scores_release_rate_range CHECK (
    innocent_receiver_release_rate IS NULL OR innocent_receiver_release_rate BETWEEN 0 AND 1
  ),
  CONSTRAINT bank_scores_satisfaction_range CHECK (
    avg_satisfaction IS NULL OR avg_satisfaction BETWEEN 1 AND 5
  ),
  CONSTRAINT bank_scores_public_requires_sample CHECK (
    is_public = FALSE OR sample_size >= 5
  )
);

COMMENT ON TABLE public.bank_scores IS 'Daily ranking snapshots; is_public only when sample_size >= 5 (k-anonymity)';
COMMENT ON COLUMN public.bank_scores.pressure_score IS 'Computed by compute_pressure_score(); higher = worse for bank';
COMMENT ON COLUMN public.bank_scores.metrics_json IS 'Raw aggregates for methodology page transparency';
COMMENT ON COLUMN public.bank_scores.cases_resolved_positive IS 'full_unfreeze + partial_release + lien_lifted_innocent_receiver';

CREATE INDEX idx_bank_scores_public ON public.bank_scores (snapshot_date DESC, pressure_score DESC)
  WHERE is_public = TRUE;
CREATE INDEX idx_bank_scores_bank_date ON public.bank_scores (bank_id, snapshot_date DESC);

-- ---------------------------------------------------------------------------
-- bank_disputes
-- ---------------------------------------------------------------------------
CREATE TABLE public.bank_disputes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id             UUID NOT NULL REFERENCES public.banks(id) ON DELETE CASCADE,
  bank_scores_id      UUID REFERENCES public.bank_scores(id) ON DELETE SET NULL,
  dispute_type        TEXT NOT NULL DEFAULT 'methodology_error',
  status              public.dispute_status NOT NULL DEFAULT 'open',
  reporter_email_hash TEXT,
  dispute_text        TEXT NOT NULL,
  evidence_urls       TEXT[] NOT NULL DEFAULT '{}',
  resolution_notes    TEXT,
  resolved_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at         TIMESTAMPTZ,
  metadata_json       JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT bank_disputes_text_not_empty CHECK (length(trim(dispute_text)) > 0)
);

COMMENT ON TABLE public.bank_disputes IS 'Public leaderboard error reports; bank or citizen initiated';
COMMENT ON COLUMN public.bank_disputes.dispute_type IS 'methodology_error | data_inaccuracy | defamation_claim';
COMMENT ON COLUMN public.bank_disputes.reporter_email_hash IS 'SHA-256 of reporter email; no raw email stored';

CREATE INDEX idx_bank_disputes_open ON public.bank_disputes (bank_id, created_at DESC)
  WHERE status IN ('open', 'under_review');
CREATE INDEX idx_bank_disputes_status ON public.bank_disputes (status);

CREATE TRIGGER trg_bank_disputes_updated_at
  BEFORE UPDATE ON public.bank_disputes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_seals (tamper-evident manifests)
-- ---------------------------------------------------------------------------
CREATE TABLE public.audit_seals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  seal_type             public.seal_type NOT NULL,
  manifest_sha256       TEXT NOT NULL,
  manifest_json         JSONB NOT NULL DEFAULT '{}',
  sealed_content_path   TEXT,
  sealed_content_bucket TEXT NOT NULL DEFAULT 'audit-seals',
  sealed_by             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sealed_by_type        public.actor_type NOT NULL DEFAULT 'system',
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT audit_seals_manifest_format CHECK (manifest_sha256 ~ '^[a-f0-9]{64}$')
);

COMMENT ON TABLE public.audit_seals IS 'SHA-256 sealed evidence bundles and export manifests';
COMMENT ON COLUMN public.audit_seals.manifest_json IS 'File list: [{path, sha256, evidence_type, uploaded_at}]';
COMMENT ON COLUMN public.audit_seals.sealed_content_path IS 'Storage path to ZIP/PDF with embedded manifest';

CREATE INDEX idx_audit_seals_case ON public.audit_seals (case_id, created_at DESC) WHERE case_id IS NOT NULL;
CREATE INDEX idx_audit_seals_manifest ON public.audit_seals (manifest_sha256);