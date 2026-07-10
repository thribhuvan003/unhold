-- =============================================================================
-- LienLiberator — Migration 010: RLS, Views, Materialized Views, Seed Data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.human_gate_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_seals ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owners (Supabase service_role bypasses regardless)
ALTER TABLE public.banks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.playbooks FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.cases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.evidence FORCE ROW LEVEL SECURITY;
ALTER TABLE public.action_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.escalations FORCE ROW LEVEL SECURITY;
ALTER TABLE public.swarm_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_actions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.agent_jobs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.consent_records FORCE ROW LEVEL SECURITY;
ALTER TABLE public.fee_agreements FORCE ROW LEVEL SECURITY;
ALTER TABLE public.human_gate_queue FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bank_scores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.bank_disputes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_seals FORCE ROW LEVEL SECURITY;

-- ===========================================================================
-- RLS POLICIES — banks
-- ===========================================================================
CREATE POLICY banks_select_public ON public.banks
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY banks_insert_admin ON public.banks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY banks_update_admin ON public.banks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY banks_delete_admin ON public.banks
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — playbooks
-- ===========================================================================
CREATE POLICY playbooks_select_public ON public.playbooks
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY playbooks_insert_admin ON public.playbooks
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY playbooks_update_admin ON public.playbooks
  FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

CREATE POLICY playbooks_delete_admin ON public.playbooks
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — profiles
-- ===========================================================================
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_operator());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.current_user_role() = 'admin')
  WITH CHECK (id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY profiles_delete_admin ON public.profiles
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — guest_sessions
-- ===========================================================================
CREATE POLICY guest_sessions_select_own ON public.guest_sessions
  FOR SELECT TO anon, authenticated
  USING (
    id = public.current_guest_session_id()
    OR public.is_operator()
  );

CREATE POLICY guest_sessions_insert_anon ON public.guest_sessions
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE); -- token hash set server-side via API; anon creates session

CREATE POLICY guest_sessions_update_own ON public.guest_sessions
  FOR UPDATE TO anon, authenticated
  USING (id = public.current_guest_session_id() OR public.is_operator())
  WITH CHECK (id = public.current_guest_session_id() OR public.is_operator());

CREATE POLICY guest_sessions_delete_admin ON public.guest_sessions
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — permissions
-- ===========================================================================
CREATE POLICY permissions_select_grantee ON public.permissions
  FOR SELECT TO authenticated
  USING (
    grantee_user_id = auth.uid()
    OR public.has_case_access(case_id, 'owner')
    OR public.is_operator()
  );

CREATE POLICY permissions_insert_owner ON public.permissions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_case_access(case_id, 'owner') OR public.is_operator());

CREATE POLICY permissions_update_owner ON public.permissions
  FOR UPDATE TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator())
  WITH CHECK (public.has_case_access(case_id, 'owner') OR public.is_operator());

CREATE POLICY permissions_delete_owner ON public.permissions
  FOR DELETE TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator());

-- ===========================================================================
-- RLS POLICIES — cases
-- ===========================================================================
CREATE POLICY cases_select_access ON public.cases
  FOR SELECT TO anon, authenticated
  USING (
    public.has_case_access(id, 'viewer')
    OR (
      public.current_guest_session_id() IS NOT NULL
      AND guest_session_id = public.current_guest_session_id()
      AND user_id IS NULL
    )
  );

CREATE POLICY cases_insert_owner ON public.cases
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR (public.current_guest_session_id() IS NOT NULL AND guest_session_id = public.current_guest_session_id())
    OR public.is_operator()
  );

CREATE POLICY cases_update_editor ON public.cases
  FOR UPDATE TO anon, authenticated
  USING (
    public.has_case_access(id, 'editor')
    OR (
      public.current_guest_session_id() IS NOT NULL
      AND guest_session_id = public.current_guest_session_id()
      AND user_id IS NULL
    )
    OR public.is_operator()
  )
  WITH CHECK (
    public.has_case_access(id, 'editor')
    OR (
      public.current_guest_session_id() IS NOT NULL
      AND guest_session_id = public.current_guest_session_id()
      AND user_id IS NULL
    )
    OR public.is_operator()
  );

CREATE POLICY cases_delete_owner ON public.cases
  FOR DELETE TO authenticated
  USING (public.has_case_access(id, 'owner') OR public.is_operator());

-- ===========================================================================
-- RLS POLICIES — evidence
-- ===========================================================================
CREATE POLICY evidence_select_access ON public.evidence
  FOR SELECT TO anon, authenticated
  USING (public.has_case_access(case_id, 'viewer') AND deleted_at IS NULL);

CREATE POLICY evidence_insert_editor ON public.evidence
  FOR INSERT TO anon, authenticated
  WITH CHECK (public.has_case_access(case_id, 'editor'));

CREATE POLICY evidence_update_editor ON public.evidence
  FOR UPDATE TO anon, authenticated
  USING (public.has_case_access(case_id, 'editor') OR public.is_operator())
  WITH CHECK (public.has_case_access(case_id, 'editor') OR public.is_operator());

CREATE POLICY evidence_delete_owner ON public.evidence
  FOR DELETE TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator());

-- ===========================================================================
-- RLS POLICIES — action_logs (read-only for users; append via SECURITY DEFINER)
-- ===========================================================================
CREATE POLICY action_logs_select_access ON public.action_logs
  FOR SELECT TO authenticated
  USING (public.has_case_access(case_id, 'viewer') OR public.is_operator());

CREATE POLICY action_logs_insert_service ON public.action_logs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator()); -- normal path: transition_case() SECURITY DEFINER

CREATE POLICY action_logs_update_deny ON public.action_logs
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY action_logs_delete_deny ON public.action_logs
  FOR DELETE TO authenticated
  USING (FALSE);

-- ===========================================================================
-- RLS POLICIES — escalations
-- ===========================================================================
CREATE POLICY escalations_select_access ON public.escalations
  FOR SELECT TO anon, authenticated
  USING (public.has_case_access(case_id, 'viewer'));

CREATE POLICY escalations_insert_editor ON public.escalations
  FOR INSERT TO authenticated
  WITH CHECK (public.has_case_access(case_id, 'editor') OR public.is_operator());

CREATE POLICY escalations_update_editor ON public.escalations
  FOR UPDATE TO authenticated
  USING (public.has_case_access(case_id, 'editor') OR public.is_operator())
  WITH CHECK (public.has_case_access(case_id, 'editor') OR public.is_operator());

CREATE POLICY escalations_delete_owner ON public.escalations
  FOR DELETE TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator());

-- ===========================================================================
-- RLS POLICIES — swarm_events
-- ===========================================================================
CREATE POLICY swarm_events_select_access ON public.swarm_events
  FOR SELECT TO anon, authenticated
  USING (public.has_case_access(case_id, 'viewer'));

CREATE POLICY swarm_events_insert_service ON public.swarm_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator()); -- append_swarm_event() is SECURITY DEFINER

CREATE POLICY swarm_events_update_deny ON public.swarm_events
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY swarm_events_delete_deny ON public.swarm_events
  FOR DELETE TO authenticated
  USING (FALSE);

-- ===========================================================================
-- RLS POLICIES — user_actions
-- ===========================================================================
CREATE POLICY user_actions_select_access ON public.user_actions
  FOR SELECT TO anon, authenticated
  USING (public.has_case_access(case_id, 'viewer'));

CREATE POLICY user_actions_insert_service ON public.user_actions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());

CREATE POLICY user_actions_update_editor ON public.user_actions
  FOR UPDATE TO authenticated
  USING (public.has_case_access(case_id, 'editor') OR public.is_operator())
  WITH CHECK (public.has_case_access(case_id, 'editor') OR public.is_operator());

CREATE POLICY user_actions_delete_operator ON public.user_actions
  FOR DELETE TO authenticated
  USING (public.is_operator());

-- ===========================================================================
-- RLS POLICIES — agent_jobs
-- ===========================================================================
CREATE POLICY agent_jobs_select_operator ON public.agent_jobs
  FOR SELECT TO authenticated
  USING (public.is_operator() OR public.has_case_access(case_id, 'viewer'));

CREATE POLICY agent_jobs_insert_operator ON public.agent_jobs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());

CREATE POLICY agent_jobs_update_operator ON public.agent_jobs
  FOR UPDATE TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

CREATE POLICY agent_jobs_delete_admin ON public.agent_jobs
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — consent_records
-- ===========================================================================
CREATE POLICY consent_records_select_own ON public.consent_records
  FOR SELECT TO anon, authenticated
  USING (
    user_id = auth.uid()
    OR guest_session_id = public.current_guest_session_id()
    OR public.has_case_access(case_id, 'owner')
    OR public.is_operator()
  );

CREATE POLICY consent_records_insert_own ON public.consent_records
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR guest_session_id = public.current_guest_session_id()
    OR public.is_operator()
  );

CREATE POLICY consent_records_update_deny ON public.consent_records
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY consent_records_delete_deny ON public.consent_records
  FOR DELETE TO authenticated
  USING (FALSE);

-- ===========================================================================
-- RLS POLICIES — fee_agreements
-- ===========================================================================
CREATE POLICY fee_agreements_select_access ON public.fee_agreements
  FOR SELECT TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator());

CREATE POLICY fee_agreements_insert_owner ON public.fee_agreements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_case_access(case_id, 'owner') OR public.is_operator());

CREATE POLICY fee_agreements_update_owner ON public.fee_agreements
  FOR UPDATE TO authenticated
  USING (public.has_case_access(case_id, 'owner') OR public.is_operator())
  WITH CHECK (public.has_case_access(case_id, 'owner') OR public.is_operator());

CREATE POLICY fee_agreements_delete_admin ON public.fee_agreements
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — human_gate_queue
-- ===========================================================================
CREATE POLICY human_gate_select_operator ON public.human_gate_queue
  FOR SELECT TO authenticated
  USING (public.is_operator() OR public.has_case_access(case_id, 'viewer'));

CREATE POLICY human_gate_insert_operator ON public.human_gate_queue
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());

CREATE POLICY human_gate_update_operator ON public.human_gate_queue
  FOR UPDATE TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

CREATE POLICY human_gate_delete_admin ON public.human_gate_queue
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — bank_scores
-- ===========================================================================
CREATE POLICY bank_scores_select_public ON public.bank_scores
  FOR SELECT TO anon, authenticated
  USING (is_public = TRUE OR public.is_operator());

CREATE POLICY bank_scores_insert_operator ON public.bank_scores
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator());

CREATE POLICY bank_scores_update_operator ON public.bank_scores
  FOR UPDATE TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

CREATE POLICY bank_scores_delete_admin ON public.bank_scores
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — bank_disputes
-- ===========================================================================
CREATE POLICY bank_disputes_select_public ON public.bank_disputes
  FOR SELECT TO anon, authenticated
  USING (TRUE); -- public transparency; no PII in rows

CREATE POLICY bank_disputes_insert_anon ON public.bank_disputes
  FOR INSERT TO anon, authenticated
  WITH CHECK (length(trim(dispute_text)) > 0);

CREATE POLICY bank_disputes_update_operator ON public.bank_disputes
  FOR UPDATE TO authenticated
  USING (public.is_operator())
  WITH CHECK (public.is_operator());

CREATE POLICY bank_disputes_delete_admin ON public.bank_disputes
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ===========================================================================
-- RLS POLICIES — audit_seals
-- ===========================================================================
CREATE POLICY audit_seals_select_access ON public.audit_seals
  FOR SELECT TO authenticated
  USING (
    case_id IS NULL
    OR public.has_case_access(case_id, 'viewer')
    OR public.is_operator()
  );

CREATE POLICY audit_seals_insert_operator ON public.audit_seals
  FOR INSERT TO authenticated
  WITH CHECK (public.is_operator() OR public.has_case_access(case_id, 'editor'));

CREATE POLICY audit_seals_update_deny ON public.audit_seals
  FOR UPDATE TO authenticated
  USING (FALSE);

CREATE POLICY audit_seals_delete_admin ON public.audit_seals
  FOR DELETE TO authenticated
  USING (public.current_user_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Views
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_case_timeline AS
SELECT
  c.id AS case_id,
  c.public_id,
  al.created_at AS event_at,
  al.action,
  al.actor_type,
  al.payload_json
FROM public.cases c
JOIN public.action_logs al ON al.case_id = c.id;

COMMENT ON VIEW public.v_case_timeline IS 'Unified audit timeline for case dashboard';

CREATE OR REPLACE VIEW public.v_public_bank_rankings AS
SELECT
  b.slug AS bank_slug,
  b.name AS bank_name,
  b.short_name,
  bs.snapshot_date,
  bs.methodology_version,
  bs.sample_size,
  bs.pressure_score,
  bs.median_days_full_unfreeze,
  bs.innocent_receiver_release_rate,
  bs.avg_satisfaction,
  bs.cases_reported,
  bs.cases_resolved_positive,
  bs.metrics_json
FROM public.bank_scores bs
JOIN public.banks b ON b.id = bs.bank_id
WHERE bs.is_public = TRUE
  AND b.is_active = TRUE;

COMMENT ON VIEW public.v_public_bank_rankings IS 'Public leaderboard API source; k-anonymity enforced upstream';

-- ---------------------------------------------------------------------------
-- Materialized view: leaderboard (refreshed daily 2am IST cron)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.mv_bank_leaderboard AS
SELECT DISTINCT ON (b.id)
  b.id AS bank_id,
  b.slug,
  b.name,
  b.short_name,
  b.bank_type,
  bs.id AS score_id,
  bs.snapshot_date,
  bs.methodology_version,
  bs.sample_size,
  bs.pressure_score,
  bs.median_days_full_unfreeze,
  bs.innocent_receiver_release_rate,
  bs.avg_satisfaction,
  bs.cases_reported,
  bs.cases_open,
  bs.cases_resolved,
  bs.cases_resolved_positive,
  bs.ombudsman_filings,
  bs.metrics_json,
  bs.computed_at,
  RANK() OVER (ORDER BY bs.pressure_score DESC NULLS LAST) AS pressure_rank
FROM public.banks b
JOIN public.bank_scores bs ON bs.bank_id = b.id
WHERE bs.is_public = TRUE
  AND b.is_active = TRUE
ORDER BY b.id, bs.snapshot_date DESC, bs.computed_at DESC
WITH NO DATA;

COMMENT ON MATERIALIZED VIEW public.mv_bank_leaderboard IS 'Latest public score per bank; REFRESH CONCURRENTLY via cron';

CREATE UNIQUE INDEX idx_mv_bank_leaderboard_bank_id ON public.mv_bank_leaderboard (bank_id);
CREATE INDEX idx_mv_bank_leaderboard_rank ON public.mv_bank_leaderboard (pressure_rank);
CREATE INDEX idx_mv_bank_leaderboard_score ON public.mv_bank_leaderboard (pressure_score DESC);

CREATE OR REPLACE FUNCTION public.refresh_leaderboard_mv()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_bank_leaderboard;
END;
$$;

COMMENT ON FUNCTION public.refresh_leaderboard_mv IS 'Call from /internal/cron/rankings after refresh_bank_score_snapshot loop';

-- ---------------------------------------------------------------------------
-- SEED DATA: SBI bank + 3 playbooks
-- ---------------------------------------------------------------------------
INSERT INTO public.banks (
  slug, name, short_name, bank_type, ifsc_prefix,
  nodal_email, nodal_phone, principal_nodal_email,
  narration_codes, metadata_json
) VALUES (
  'state-bank-of-india',
  'State Bank of India',
  'SBI',
  'public_sector',
  'SBIN',
  'customer.care@sbi.co.in',
  '1800112211',
  'customer.care@sbi.co.in',
  ARRAY['CFCFRMS', 'LIEN', 'DEBIT FREEZE', 'CREDIT FREEZE'],
  jsonb_build_object(
    'helpline', '1800112211',
    'cyber_helpline', '1930',
    'branch_locator', 'https://www.sbi.co.in/web/home/locator/branch'
  )
);

-- Playbook 1: innocent_receiver + cyber_upi_chain (SBI)
INSERT INTO public.playbooks (
  slug, bank_id, freeze_reason, victim_role, title, description,
  steps_json, checklist_json, timeline_copy_json, templates_json, panic_checklist_json
)
SELECT
  'innocent_receiver_upi_chain_sbi',
  b.id,
  'cyber_upi_chain',
  'innocent_receiver',
  'SBI Innocent Receiver — UPI Chain Lien Release',
  'Playbook for users who received fraudulent UPI and had account liened; Section 9 innocent receiver path.',
  jsonb_build_array(
    jsonb_build_object('level', 'L1', 'channel', 'branch_manager', 'template', 'sbi_branch_lien_release', 'wait_days', 7),
    jsonb_build_object('level', 'L2', 'channel', 'nodal_officer', 'template', 'sbi_nodal_escalation', 'wait_days', 10, 'required_proof', 'L1'),
    jsonb_build_object('level', 'L3', 'channel', 'rbi_cms', 'template', 'rbi_ombudsman_sbi', 'wait_days', 90, 'required_proof', 'L2', 'requires_user_consent', true)
  ),
  jsonb_build_array(
    jsonb_build_object('evidence_type', 'freeze_sms', 'required', true, 'label', 'Bank freeze SMS screenshot'),
    jsonb_build_object('evidence_type', 'bank_statement', 'required', true, 'label', 'Statement showing lien entry'),
    jsonb_build_object('evidence_type', 'ncrp_acknowledgement', 'required', false, 'label', 'NCRP 14-digit acknowledgement'),
    jsonb_build_object('evidence_type', 'pan_card', 'required', true, 'label', 'PAN (masked upload)'),
    jsonb_build_object('evidence_type', 'chat_screenshot', 'required', false, 'label', 'UPI transaction chat/screenshot')
  ),
  jsonb_build_object(
    'panic_days', '7-15',
    'typical_days', '45-75',
    'complex_days', '90-180',
    'panic_message', 'Screenshot your freeze SMS now. Call 1930 if you are the fraud victim.'
  ),
  jsonb_build_object(
    'innocent_receiver_template', 'sbi_s9_lien_release_innocent_receiver',
    'branch_template', 'sbi_branch_lien_release',
    'nodal_template', 'sbi_nodal_escalation',
    'rbi_template', 'rbi_ombudsman_sbi'
  ),
  jsonb_build_array(
    'Screenshot freeze SMS immediately',
    'Do NOT transfer money to anyone promising unfreeze',
    'Note narration code: CFCFRMS / LIEN / DEBIT FREEZE',
    'Call 1930 if you lost money (victim path)'
  )
FROM public.banks b WHERE b.slug = 'state-bank-of-india';

-- Playbook 2: victim + cyber_upi_chain (SBI)
INSERT INTO public.playbooks (
  slug, bank_id, freeze_reason, victim_role, title, description,
  steps_json, checklist_json, timeline_copy_json, templates_json, panic_checklist_json
)
SELECT
  'victim_upi_chain_sbi',
  b.id,
  'cyber_upi_chain',
  'victim',
  'SBI Fraud Victim — UPI Chain Recovery',
  'Playbook for users who lost money via UPI fraud; NCRP filing and bank follow-up.',
  jsonb_build_array(
    jsonb_build_object('level', 'L1', 'channel', 'branch_manager', 'template', 'sbi_branch_fraud_complaint', 'wait_days', 7),
    jsonb_build_object('level', 'L2', 'channel', 'nodal_officer', 'template', 'sbi_nodal_escalation', 'wait_days', 10, 'required_proof', 'L1'),
    jsonb_build_object('level', 'L3', 'channel', 'rbi_cms', 'template', 'rbi_ombudsman_sbi', 'wait_days', 90, 'required_proof', 'L2', 'requires_user_consent', true),
    jsonb_build_object('level', 'L4', 'channel', 'rti', 'template', 'rti_sbi_cyber_cell', 'wait_days', 30, 'required_proof', 'L3')
  ),
  jsonb_build_array(
    jsonb_build_object('evidence_type', 'ncrp_acknowledgement', 'required', true, 'label', 'NCRP 14-digit acknowledgement'),
    jsonb_build_object('evidence_type', 'freeze_sms', 'required', false, 'label', 'Any bank communication'),
    jsonb_build_object('evidence_type', 'chat_screenshot', 'required', true, 'label', 'Fraud transaction proof'),
    jsonb_build_object('evidence_type', 'bank_statement', 'required', true, 'label', 'Statement showing debit')
  ),
  jsonb_build_object(
    'panic_days', '1-7',
    'typical_days', '45-90',
    'complex_days', '90-180',
    'panic_message', 'File on cybercrime.gov.in within 24 hours. Call 1930 immediately.'
  ),
  jsonb_build_object(
    'ncrp_followup_template', 'ncrp_section8_followup',
    'branch_template', 'sbi_branch_fraud_complaint',
    'nodal_template', 'sbi_nodal_escalation',
    'rbi_template', 'rbi_ombudsman_sbi',
    'rti_template', 'rti_sbi_cyber_cell'
  ),
  jsonb_build_array(
    'Call 1930 immediately',
    'File complaint on cybercrime.gov.in',
    'Save 14-digit NCRP acknowledgement',
    'Do not pay unfreeze agents on Telegram'
  )
FROM public.banks b WHERE b.slug = 'state-bank-of-india';

-- Playbook 3: innocent_receiver generic (any bank fallback)
INSERT INTO public.playbooks (
  slug, bank_id, freeze_reason, victim_role, title, description,
  steps_json, checklist_json, timeline_copy_json, templates_json
)
VALUES (
  'innocent_receiver_upi_chain_generic',
  NULL,
  'cyber_upi_chain',
  'innocent_receiver',
  'Generic Innocent Receiver — UPI Chain',
  'Fallback playbook for non-SBI banks until bank-specific pack added.',
  jsonb_build_array(
    jsonb_build_object('level', 'L1', 'channel', 'branch_manager', 'template', 'generic_branch_lien_release', 'wait_days', 7),
    jsonb_build_object('level', 'L2', 'channel', 'nodal_officer', 'template', 'generic_nodal_escalation', 'wait_days', 10, 'required_proof', 'L1'),
    jsonb_build_object('level', 'L3', 'channel', 'rbi_cms', 'template', 'generic_rbi_ombudsman', 'wait_days', 90, 'required_proof', 'L2', 'requires_user_consent', true)
  ),
  jsonb_build_array(
    jsonb_build_object('evidence_type', 'freeze_sms', 'required', true),
    jsonb_build_object('evidence_type', 'bank_statement', 'required', true),
    jsonb_build_object('evidence_type', 'pan_card', 'required', true)
  ),
  jsonb_build_object('typical_days', '45-75', 'complex_days', '90-180'),
  jsonb_build_object('innocent_receiver_template', 'generic_s9_lien_release_innocent_receiver')
);

-- Grant API access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.banks, public.playbooks, public.bank_scores, public.bank_disputes TO anon, authenticated;
GRANT SELECT ON public.v_public_bank_rankings, public.mv_bank_leaderboard TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT INSERT ON public.guest_sessions, public.cases, public.evidence, public.consent_records, public.bank_disputes TO anon;
GRANT EXECUTE ON FUNCTION public.transition_case TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_swarm_event TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_pressure_score TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_leaderboard_mv TO authenticated;
GRANT EXECUTE ON FUNCTION public.hash_token TO anon, authenticated;