-- =============================================================================
-- LienLiberator — Migration 002: Reference Tables (banks, playbooks)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- banks
-- ---------------------------------------------------------------------------
CREATE TABLE public.banks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL,
  name                  TEXT NOT NULL,
  short_name            TEXT,
  bank_type             public.bank_type NOT NULL DEFAULT 'other',
  ifsc_prefix           TEXT,
  nodal_email           TEXT,
  nodal_phone           TEXT,
  principal_nodal_email TEXT,
  rbi_ombudsman_scheme  TEXT NOT NULL DEFAULT 'RB-IOS',
  cms_portal_url        TEXT NOT NULL DEFAULT 'https://cms.rbi.org.in',
  website_url           TEXT,
  narration_codes       TEXT[] NOT NULL DEFAULT '{}',
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT banks_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT banks_slug_unique UNIQUE (slug),
  CONSTRAINT banks_ifsc_prefix_len CHECK (ifsc_prefix IS NULL OR length(ifsc_prefix) = 4)
);

COMMENT ON TABLE public.banks IS 'Master bank directory; SBI seeded in 010';
COMMENT ON COLUMN public.banks.slug IS 'URL-safe identifier e.g. state-bank-of-india';
COMMENT ON COLUMN public.banks.ifsc_prefix IS 'First 4 chars of IFSC for auto-detect';
COMMENT ON COLUMN public.banks.narration_codes IS 'Known SMS/statement codes e.g. CFCFRMS, LIEN, DEBIT FREEZE';
COMMENT ON COLUMN public.banks.metadata_json IS 'Extensible: branch_locator_url, helpline, etc.';

CREATE INDEX idx_banks_active_slug ON public.banks (is_active, slug) WHERE is_active = TRUE;
CREATE INDEX idx_banks_ifsc_prefix ON public.banks (ifsc_prefix) WHERE ifsc_prefix IS NOT NULL;

-- ---------------------------------------------------------------------------
-- playbooks
-- ---------------------------------------------------------------------------
CREATE TABLE public.playbooks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL,
  bank_id             UUID REFERENCES public.banks(id) ON DELETE SET NULL,
  freeze_reason       public.freeze_reason NOT NULL,
  victim_role         public.victim_role NOT NULL,
  title               TEXT NOT NULL,
  description         TEXT,
  steps_json          JSONB NOT NULL DEFAULT '[]',
  checklist_json      JSONB NOT NULL DEFAULT '[]',
  timeline_copy_json  JSONB NOT NULL DEFAULT '{}',
  templates_json      JSONB NOT NULL DEFAULT '{}',
  panic_checklist_json JSONB NOT NULL DEFAULT '[]',
  version             INTEGER NOT NULL DEFAULT 1,
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT playbooks_slug_unique UNIQUE (slug),
  CONSTRAINT playbooks_version_positive CHECK (version > 0),
  CONSTRAINT playbooks_steps_is_array CHECK (jsonb_typeof(steps_json) = 'array'),
  CONSTRAINT playbooks_unique_combo UNIQUE (bank_id, freeze_reason, victim_role, version)
);

COMMENT ON TABLE public.playbooks IS 'Escalation ladder + templates per freeze_reason × victim_role × bank';
COMMENT ON COLUMN public.playbooks.bank_id IS 'NULL = generic fallback playbook for any bank';
COMMENT ON COLUMN public.playbooks.steps_json IS 'Array of {level, channel, template, wait_days, required_proof, requires_user_consent}';
COMMENT ON COLUMN public.playbooks.checklist_json IS 'Required evidence items with evidence_type and optional flag';
COMMENT ON COLUMN public.playbooks.timeline_copy_json IS 'UI copy: panic, typical, complex day ranges';
COMMENT ON COLUMN public.playbooks.templates_json IS 'Map of template_slug → metadata; bodies live in object storage';

CREATE INDEX idx_playbooks_lookup
  ON public.playbooks (freeze_reason, victim_role, is_active)
  WHERE is_active = TRUE;

CREATE INDEX idx_playbooks_bank
  ON public.playbooks (bank_id)
  WHERE bank_id IS NOT NULL;

-- updated_at trigger helper (reused across tables)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at IS 'BEFORE UPDATE trigger: sets updated_at = now()';

CREATE TRIGGER trg_banks_updated_at
  BEFORE UPDATE ON public.banks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_playbooks_updated_at
  BEFORE UPDATE ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();