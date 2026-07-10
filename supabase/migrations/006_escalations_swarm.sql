-- =============================================================================
-- LienLiberator — Migration 006: Escalations, Swarm Events, User Actions
-- =============================================================================

-- ---------------------------------------------------------------------------
-- escalations
-- ---------------------------------------------------------------------------
CREATE TABLE public.escalations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                 UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  level                   public.escalation_level NOT NULL,
  channel                 public.escalation_channel NOT NULL,
  status                  public.escalation_status NOT NULL DEFAULT 'draft',
  letter_template_id      TEXT,
  letter_subject          TEXT,
  letter_body             TEXT,
  letter_body_html        TEXT,
  user_consent_at         TIMESTAMPTZ,
  user_consent_ip_hash    TEXT,
  approved_at             TIMESTAMPTZ,
  sent_at                 TIMESTAMPTZ,
  sent_proof_evidence_id  UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  response_due_at         TIMESTAMPTZ,
  response_received_at    TIMESTAMPTZ,
  response_evidence_id    UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  wait_days               INTEGER NOT NULL DEFAULT 7,
  created_by_agent        public.agent_role,
  metadata_json           JSONB NOT NULL DEFAULT '{}',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT escalations_case_level_unique UNIQUE (case_id, level),
  CONSTRAINT escalations_wait_days_positive CHECK (wait_days > 0),
  CONSTRAINT escalations_sent_requires_proof CHECK (
    status NOT IN ('sent', 'response_received', 'timeout')
    OR sent_at IS NOT NULL
  )
);

COMMENT ON TABLE public.escalations IS 'Per-level letter drafts; copy-only, user mark-sent + proof';
COMMENT ON COLUMN public.escalations.letter_template_id IS 'e.g. sbi_branch_lien_release, rbi_ombudsman_sbi';
COMMENT ON COLUMN public.escalations.sent_proof_evidence_id IS 'Screenshot/email proof user sent letter';
COMMENT ON COLUMN public.escalations.response_due_at IS 'sent_at + wait_days from playbook';

CREATE INDEX idx_escalations_case ON public.escalations (case_id);
CREATE INDEX idx_escalations_status ON public.escalations (status, response_due_at) WHERE status = 'sent';
CREATE INDEX idx_escalations_overdue ON public.escalations (response_due_at) WHERE status = 'sent' AND response_received_at IS NULL;

CREATE TRIGGER trg_escalations_updated_at
  BEFORE UPDATE ON public.escalations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- swarm_events (realtime feed for SwarmLog)
-- ---------------------------------------------------------------------------
CREATE TABLE public.swarm_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  agent_role          public.agent_role NOT NULL,
  event_type          TEXT NOT NULL,
  severity            public.swarm_event_severity NOT NULL DEFAULT 'info',
  message             TEXT NOT NULL,
  message_hi          TEXT,
  metadata_json       JSONB NOT NULL DEFAULT '{}',
  automated           BOOLEAN NOT NULL DEFAULT TRUE,
  job_id              UUID, -- FK added in 007
  langfuse_trace_id   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.swarm_events IS 'Immutable agent activity log; subscribed via Supabase Realtime';
COMMENT ON COLUMN public.swarm_events.event_type IS 'e.g. classified, reminder_sent, letter_drafted, cost_cap_hit';
COMMENT ON COLUMN public.swarm_events.message_hi IS 'Optional Hindi UI chrome translation';
COMMENT ON COLUMN public.swarm_events.automated IS 'FALSE for human_ops interventions';

CREATE INDEX idx_swarm_events_case_created ON public.swarm_events (case_id, created_at DESC);
CREATE INDEX idx_swarm_events_severity ON public.swarm_events (case_id, severity) WHERE severity IN ('warn', 'error', 'human_required');

-- ---------------------------------------------------------------------------
-- user_actions (NextStepsCard inbox)
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_actions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  action_type     public.user_action_type NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  title_hi        TEXT,
  priority        INTEGER NOT NULL DEFAULT 0,
  due_at          TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  escalation_id   UUID REFERENCES public.escalations(id) ON DELETE SET NULL,
  evidence_id     UUID REFERENCES public.evidence(id) ON DELETE SET NULL,
  metadata_json   JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT user_actions_completion_exclusive CHECK (
    completed_at IS NULL OR dismissed_at IS NULL
  )
);

COMMENT ON TABLE public.user_actions IS 'Action inbox items; one primary action surfaces on dashboard';
COMMENT ON COLUMN public.user_actions.priority IS 'Higher = more urgent; 100 = panic keyword';
COMMENT ON COLUMN public.user_actions.escalation_id IS 'Linked escalation for approve/mark-sent actions';

CREATE INDEX idx_user_actions_case_open ON public.user_actions (case_id, priority DESC, due_at)
  WHERE completed_at IS NULL AND dismissed_at IS NULL;
CREATE INDEX idx_user_actions_due ON public.user_actions (due_at)
  WHERE completed_at IS NULL AND dismissed_at IS NULL AND due_at IS NOT NULL;