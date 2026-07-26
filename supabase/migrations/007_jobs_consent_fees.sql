-- =============================================================================
-- LienLiberator — Migration 007: Agent Jobs, Consent, Fees, Human Gate
-- =============================================================================

-- ---------------------------------------------------------------------------
-- agent_jobs
-- ---------------------------------------------------------------------------
CREATE TABLE public.agent_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  job_type          TEXT NOT NULL,
  agent_role        public.agent_role,
  status            public.job_status NOT NULL DEFAULT 'pending',
  idempotency_key   TEXT NOT NULL,
  payload_json      JSONB NOT NULL DEFAULT '{}',
  result_json       JSONB NOT NULL DEFAULT '{}',
  error_message     TEXT,
  attempts          INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  scheduled_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  cost_usd          NUMERIC(10,6) NOT NULL DEFAULT 0,
  langfuse_trace_id TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT agent_jobs_idempotency_unique UNIQUE (idempotency_key),
  CONSTRAINT agent_jobs_attempts_nonneg CHECK (attempts >= 0),
  CONSTRAINT agent_jobs_max_attempts_positive CHECK (max_attempts > 0)
);

COMMENT ON TABLE public.agent_jobs IS 'Durable job queue; idempotency_key = {job_type}:{case_id}:{date_bucket}';
COMMENT ON COLUMN public.agent_jobs.job_type IS 'e.g. intake_classify, monitor_tick, draft_letter, compute_rankings';
COMMENT ON COLUMN public.agent_jobs.cost_usd IS 'Token cost from Langfuse; increments cases.agent_cost_usd';

CREATE INDEX idx_agent_jobs_pending ON public.agent_jobs (scheduled_at)
  WHERE status = 'pending';
CREATE INDEX idx_agent_jobs_case ON public.agent_jobs (case_id, created_at DESC);
CREATE INDEX idx_agent_jobs_status ON public.agent_jobs (status, scheduled_at);

-- FK from swarm_events → agent_jobs
ALTER TABLE public.swarm_events
  ADD CONSTRAINT swarm_events_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES public.agent_jobs(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- consent_records (append-only; withdrawal = new row)
-- ---------------------------------------------------------------------------
CREATE TABLE public.consent_records (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_session_id      UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  case_id               UUID REFERENCES public.cases(id) ON DELETE SET NULL,
  consent_type          public.consent_type NOT NULL,
  granted               BOOLEAN NOT NULL,
  consent_text_version  TEXT NOT NULL,
  consent_text_hash     TEXT NOT NULL,
  ip_hash               TEXT,
  user_agent_hash       TEXT,
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT consent_records_subject_required CHECK (
    user_id IS NOT NULL OR guest_session_id IS NOT NULL
  ),
  CONSTRAINT consent_records_text_hash_format CHECK (consent_text_hash ~ '^[a-f0-9]{64}$')
);

COMMENT ON TABLE public.consent_records IS 'DPDP consent log; append-only, never UPDATE/DELETE';
COMMENT ON COLUMN public.consent_records.consent_text_version IS 'e.g. disclaimer_v2.0_2026-06-01';
COMMENT ON COLUMN public.consent_records.consent_text_hash IS 'SHA-256 of exact consent text shown';
COMMENT ON COLUMN public.consent_records.granted IS 'FALSE row = withdrawal event';

CREATE INDEX idx_consent_records_user ON public.consent_records (user_id, consent_type, created_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX idx_consent_records_guest ON public.consent_records (guest_session_id, consent_type, created_at DESC)
  WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_consent_records_case ON public.consent_records (case_id) WHERE case_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.deny_consent_records_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'consent_records is append-only; % not permitted', TG_OP;
END;
$$;

CREATE TRIGGER trg_consent_records_no_update
  BEFORE UPDATE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.deny_consent_records_mutation();

CREATE TRIGGER trg_consent_records_no_delete
  BEFORE DELETE ON public.consent_records
  FOR EACH ROW EXECUTE FUNCTION public.deny_consent_records_mutation();

-- ---------------------------------------------------------------------------
-- fee_agreements
-- ---------------------------------------------------------------------------
CREATE TABLE public.fee_agreements (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                 UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tier                    public.fee_tier NOT NULL DEFAULT 'free',
  contingency_rate        NUMERIC(4,3) NOT NULL DEFAULT 0.030,
  contingency_cap_paise   BIGINT NOT NULL DEFAULT 2500000,
  contingency_min_paise   BIGINT NOT NULL DEFAULT 200000,
  amount_released_paise   BIGINT,
  fee_due_paise           BIGINT,
  fee_collected_paise     BIGINT NOT NULL DEFAULT 0,
  invoice_status          public.invoice_status NOT NULL DEFAULT 'none',
  invoice_number          TEXT,
  invoice_issued_at       TIMESTAMPTZ,
  invoice_paid_at         TIMESTAMPTZ,
  e_signed_at             TIMESTAMPTZ,
  e_sign_ip_hash          TEXT,
  resolution_type         public.resolution_type,
  metadata_json           JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT fee_agreements_case_unique UNIQUE (case_id),
  CONSTRAINT fee_agreements_contingency_rate_range CHECK (contingency_rate BETWEEN 0 AND 1),
  CONSTRAINT fee_agreements_cap_nonneg CHECK (contingency_cap_paise >= 0),
  CONSTRAINT fee_agreements_min_nonneg CHECK (contingency_min_paise >= 0),
  CONSTRAINT fee_agreements_released_nonneg CHECK (amount_released_paise IS NULL OR amount_released_paise >= 0),
  CONSTRAINT fee_agreements_fee_due_nonneg CHECK (fee_due_paise IS NULL OR fee_due_paise >= 0),
  CONSTRAINT fee_agreements_collected_nonneg CHECK (fee_collected_paise >= 0)
);

COMMENT ON TABLE public.fee_agreements IS 'Monetization; fee triggers ONLY on verified release resolutions';
COMMENT ON COLUMN public.fee_agreements.contingency_rate IS 'Default 3% (0.030) of net released amount';
COMMENT ON COLUMN public.fee_agreements.contingency_cap_paise IS '₹25,000 cap = 2500000 paise';
COMMENT ON COLUMN public.fee_agreements.contingency_min_paise IS '₹2,000 minimum fee = 200000 paise';
COMMENT ON COLUMN public.fee_agreements.fee_due_paise IS 'Computed on RESOLVED: min(max(rate*released, min), cap)';

CREATE INDEX idx_fee_agreements_invoice ON public.fee_agreements (invoice_status) WHERE invoice_status IN ('issued', 'disputed');

CREATE TRIGGER trg_fee_agreements_updated_at
  BEFORE UPDATE ON public.fee_agreements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- human_gate_queue
-- ---------------------------------------------------------------------------
CREATE TABLE public.human_gate_queue (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  queue_reason      TEXT NOT NULL,
  priority          INTEGER NOT NULL DEFAULT 0,
  status            public.human_gate_status NOT NULL DEFAULT 'pending',
  assigned_to       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_at       TIMESTAMPTZ,
  resolved_at       TIMESTAMPTZ,
  resolved_by       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolution_notes  TEXT,
  metadata_json     JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.human_gate_queue IS 'Ops approval queue: panic keywords, cost cap, low confidence';
COMMENT ON COLUMN public.human_gate_queue.queue_reason IS 'e.g. panic_keyword, agent_cost_cap, vision_low_confidence';
COMMENT ON COLUMN public.human_gate_queue.priority IS '100 = panic; 60 = ₹1L+ or 60+ days';

CREATE INDEX idx_human_gate_pending ON public.human_gate_queue (priority DESC, created_at)
  WHERE status = 'pending';
CREATE INDEX idx_human_gate_assigned ON public.human_gate_queue (assigned_to, status)
  WHERE assigned_to IS NOT NULL AND status = 'assigned';
CREATE INDEX idx_human_gate_case ON public.human_gate_queue (case_id);

CREATE TRIGGER trg_human_gate_updated_at
  BEFORE UPDATE ON public.human_gate_queue
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();