-- =============================================================================
-- LienLiberator — Migration 004: Cases (core entity)
-- =============================================================================

CREATE SEQUENCE public.case_public_id_seq
  START WITH 10001
  INCREMENT BY 1
  NO MAXVALUE
  CACHE 1;

COMMENT ON SEQUENCE public.case_public_id_seq IS 'Human-facing case IDs: LL-10001, LL-10002, ...';

CREATE OR REPLACE FUNCTION public.generate_case_public_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'LL-' || nextval('public.case_public_id_seq')::TEXT;
END;
$$;

-- ---------------------------------------------------------------------------
-- cases
-- ---------------------------------------------------------------------------
CREATE TABLE public.cases (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id                   TEXT NOT NULL DEFAULT public.generate_case_public_id(),
  user_id                     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_session_id            UUID REFERENCES public.guest_sessions(id) ON DELETE SET NULL,
  bank_id                     UUID REFERENCES public.banks(id) ON DELETE RESTRICT,
  playbook_id                 UUID REFERENCES public.playbooks(id) ON DELETE SET NULL,
  status                      public.case_status NOT NULL DEFAULT 'new',
  freeze_reason               public.freeze_reason,
  freeze_type                 public.freeze_type,
  victim_role                 public.victim_role,
  resolution_type             public.resolution_type,
  frozen_amount_paise         BIGINT,
  released_amount_paise       BIGINT,
  account_last4               TEXT,
  pan_masked                  TEXT,
  ncrp_id                     TEXT,
  external_report_url         TEXT,
  state_code                  TEXT,
  district                    TEXT,
  narration_codes             TEXT[] NOT NULL DEFAULT '{}',
  intake_json                 JSONB NOT NULL DEFAULT '{}',
  classification_confidence   NUMERIC(4,3),
  escalation_level            public.escalation_level NOT NULL DEFAULT 'L1',
  swarm_paused                BOOLEAN NOT NULL DEFAULT FALSE,
  agent_cost_usd              NUMERIC(10,4) NOT NULL DEFAULT 0,
  agent_cost_cap_usd          NUMERIC(10,4) NOT NULL DEFAULT 2.00,
  user_action_required        BOOLEAN NOT NULL DEFAULT FALSE,
  next_check_at               TIMESTAMPTZ,
  next_user_action_type       public.user_action_type,
  next_user_action_due_at     TIMESTAMPTZ,
  public_stats_opt_in         BOOLEAN NOT NULL DEFAULT FALSE,
  satisfaction_score          SMALLINT,
  resolution_confirmed_by     TEXT,
  resolution_notes            TEXT,
  frozen_since                DATE,
  resolved_at                 TIMESTAMPTZ,
  closed_at                   TIMESTAMPTZ,
  stalled_at                  TIMESTAMPTZ,
  last_activity_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  erasure_requested_at        TIMESTAMPTZ,
  erasure_scheduled_at        TIMESTAMPTZ,
  erasure_completed_at        TIMESTAMPTZ,
  metadata_json               JSONB NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT cases_public_id_unique UNIQUE (public_id),
  CONSTRAINT cases_owner_required CHECK (user_id IS NOT NULL OR guest_session_id IS NOT NULL),
  CONSTRAINT cases_frozen_amount_nonneg CHECK (frozen_amount_paise IS NULL OR frozen_amount_paise >= 0),
  CONSTRAINT cases_released_amount_nonneg CHECK (released_amount_paise IS NULL OR released_amount_paise >= 0),
  CONSTRAINT cases_ncrp_format CHECK (ncrp_id IS NULL OR ncrp_id ~ '^\d{14}$'),
  CONSTRAINT cases_account_last4_format CHECK (account_last4 IS NULL OR account_last4 ~ '^\d{4}$'),
  CONSTRAINT cases_pan_masked_format CHECK (pan_masked IS NULL OR pan_masked ~ '^[A-Z]{5}\*{4}[A-Z]$'),
  CONSTRAINT cases_state_code_format CHECK (state_code IS NULL OR state_code ~ '^[A-Z]{2}$'),
  CONSTRAINT cases_satisfaction_range CHECK (satisfaction_score IS NULL OR satisfaction_score BETWEEN 1 AND 5),
  CONSTRAINT cases_classification_confidence_range CHECK (
    classification_confidence IS NULL OR classification_confidence BETWEEN 0 AND 1
  ),
  CONSTRAINT cases_resolution_confirmed_by_values CHECK (
    resolution_confirmed_by IS NULL OR resolution_confirmed_by IN ('user', 'operator', 'evidence')
  )
);

COMMENT ON TABLE public.cases IS 'Persistent case state; single source of truth for journey';
COMMENT ON COLUMN public.cases.public_id IS 'User-facing ID shown in UI and letters';
COMMENT ON COLUMN public.cases.intake_json IS 'Wizard answers: freeze_date_noticed, bank_branch, etc.';
COMMENT ON COLUMN public.cases.agent_cost_usd IS 'Accumulated LLM cost; cap triggers human_escalation';
COMMENT ON COLUMN public.cases.next_check_at IS 'Cron tick processes cases where next_check_at <= now()';
COMMENT ON COLUMN public.cases.public_stats_opt_in IS 'Per-case opt-in for anonymized leaderboard contribution';
COMMENT ON COLUMN public.cases.erasure_scheduled_at IS 'DPDP erasure SLA: requested_at + 30 days';

-- FK from permissions → cases (deferred from 003)
ALTER TABLE public.permissions
  ADD CONSTRAINT permissions_case_id_fkey
  FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX idx_cases_user_id ON public.cases (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_cases_guest_session ON public.cases (guest_session_id) WHERE guest_session_id IS NOT NULL;
CREATE INDEX idx_cases_status ON public.cases (status);
CREATE INDEX idx_cases_next_check ON public.cases (next_check_at) WHERE next_check_at IS NOT NULL AND status NOT IN ('closed', 'resolved');
CREATE INDEX idx_cases_bank_status ON public.cases (bank_id, status);
CREATE INDEX idx_cases_public_id ON public.cases (public_id);
CREATE INDEX idx_cases_ncrp ON public.cases (ncrp_id) WHERE ncrp_id IS NOT NULL;
CREATE INDEX idx_cases_erasure ON public.cases (erasure_scheduled_at) WHERE erasure_scheduled_at IS NOT NULL AND erasure_completed_at IS NULL;
CREATE INDEX idx_cases_user_action ON public.cases (user_action_required, next_user_action_due_at) WHERE user_action_required = TRUE;

CREATE TRIGGER trg_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-grant owner permission when user_id set
CREATE OR REPLACE FUNCTION public.grant_case_owner_permission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.user_id IS DISTINCT FROM NEW.user_id) THEN
    INSERT INTO public.permissions (case_id, grantee_user_id, permission_level, granted_by)
    VALUES (NEW.id, NEW.user_id, 'owner', NEW.user_id)
    ON CONFLICT (case_id, grantee_user_id) DO UPDATE
      SET permission_level = 'owner', revoked_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cases_owner_permission
  AFTER INSERT OR UPDATE OF user_id ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.grant_case_owner_permission();