-- =============================================================================
-- LienLiberator — Migration 009: Core Functions & Triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RLS helper functions (used in policies in 010)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'guest'::public.user_role
  );
$$;

COMMENT ON FUNCTION public.current_user_role IS 'Returns profiles.role for auth.uid(); guest if no profile';

CREATE OR REPLACE FUNCTION public.is_operator()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() IN ('operator', 'admin');
$$;

CREATE OR REPLACE FUNCTION public.current_guest_session_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'guest_session_id', '')::UUID;
$$;

COMMENT ON FUNCTION public.current_guest_session_id IS 'JWT custom claim set by guest session middleware';

CREATE OR REPLACE FUNCTION public.has_case_access(
  p_case_id UUID,
  p_min_level public.permission_level DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level public.permission_level;
  v_rank INTEGER;
  v_required INTEGER;
BEGIN
  IF public.is_operator() THEN
    RETURN TRUE;
  END IF;

  -- Direct owner via cases.user_id
  IF EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id AND c.user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Guest session ownership
  IF public.current_guest_session_id() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.cases c
    WHERE c.id = p_case_id
      AND c.guest_session_id = public.current_guest_session_id()
      AND c.user_id IS NULL
  ) THEN
    RETURN TRUE;
  END IF;

  -- Permission grant
  SELECT p.permission_level INTO v_level
  FROM public.permissions p
  WHERE p.case_id = p_case_id
    AND p.grantee_user_id = auth.uid()
    AND p.revoked_at IS NULL
    AND (p.expires_at IS NULL OR p.expires_at > now())
  LIMIT 1;

  IF v_level IS NULL THEN
    RETURN FALSE;
  END IF;

  v_rank := CASE v_level
    WHEN 'viewer' THEN 1
    WHEN 'parent_readonly' THEN 1
    WHEN 'editor' THEN 2
    WHEN 'owner' THEN 3
  END;

  v_required := CASE p_min_level
    WHEN 'viewer' THEN 1
    WHEN 'parent_readonly' THEN 1
    WHEN 'editor' THEN 2
    WHEN 'owner' THEN 3
  END;

  RETURN v_rank >= v_required;
END;
$$;

COMMENT ON FUNCTION public.has_case_access IS 'RLS helper: operator bypass, owner, guest, or permission grant';

-- ---------------------------------------------------------------------------
-- append_swarm_event()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_swarm_event(
  p_case_id         UUID,
  p_agent_role      public.agent_role,
  p_event_type      TEXT,
  p_message         TEXT,
  p_severity        public.swarm_event_severity DEFAULT 'info',
  p_message_hi      TEXT DEFAULT NULL,
  p_metadata_json   JSONB DEFAULT '{}',
  p_automated       BOOLEAN DEFAULT TRUE,
  p_job_id          UUID DEFAULT NULL,
  p_langfuse_trace  TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO public.swarm_events (
    case_id, agent_role, event_type, severity, message, message_hi,
    metadata_json, automated, job_id, langfuse_trace_id
  ) VALUES (
    p_case_id, p_agent_role, p_event_type, p_severity, p_message, p_message_hi,
    COALESCE(p_metadata_json, '{}'), p_automated, p_job_id, p_langfuse_trace
  )
  RETURNING id INTO v_event_id;

  -- Mirror critical events to action_logs
  IF p_severity IN ('warn', 'error', 'human_required') THEN
    INSERT INTO public.action_logs (case_id, actor_type, actor_id, action, payload_json)
    VALUES (
      p_case_id,
      CASE WHEN p_automated THEN 'agent'::public.actor_type ELSE 'operator'::public.actor_type END,
      COALESCE(p_job_id::TEXT, p_agent_role::TEXT),
      'swarm.' || p_event_type,
      jsonb_build_object('severity', p_severity, 'message', left(p_message, 500))
    );
  END IF;

  RETURN v_event_id;
END;
$$;

COMMENT ON FUNCTION public.append_swarm_event IS 'Insert swarm_events row; mirrors warn+ to action_logs';

-- ---------------------------------------------------------------------------
-- compute_pressure_score()
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_pressure_score(
  p_median_days_full_unfreeze     NUMERIC DEFAULT NULL,
  p_innocent_receiver_release_rate NUMERIC DEFAULT NULL,
  p_cases_open                    INTEGER DEFAULT 0,
  p_cases_reported                INTEGER DEFAULT 0,
  p_avg_satisfaction              NUMERIC DEFAULT NULL,
  p_ombudsman_filings             INTEGER DEFAULT 0
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_score NUMERIC := 0;
  v_open_ratio NUMERIC := 0;
  v_median_component NUMERIC := 0;
  v_release_component NUMERIC := 0;
  v_satisfaction_component NUMERIC := 0;
  v_ombudsman_component NUMERIC := 0;
BEGIN
  -- v1 formula from BUILD_SPEC §4.3
  IF p_median_days_full_unfreeze IS NOT NULL THEN
    v_median_component := 0.30 * LEAST(p_median_days_full_unfreeze / 180.0, 1.0) * 100;
  END IF;

  IF p_innocent_receiver_release_rate IS NOT NULL THEN
    v_release_component := 0.25 * (1.0 - p_innocent_receiver_release_rate) * 100;
  END IF;

  IF p_cases_reported > 0 THEN
    v_open_ratio := p_cases_open::NUMERIC / p_cases_reported::NUMERIC;
    v_score := v_score + 0.20 * v_open_ratio * 100;
  END IF;

  v_score := v_score + v_median_component + v_release_component;

  IF p_avg_satisfaction IS NOT NULL THEN
    v_satisfaction_component := 0.15 * (1.0 - (p_avg_satisfaction / 5.0)) * 100;
    v_score := v_score + v_satisfaction_component;
  END IF;

  IF p_cases_reported > 0 THEN
    v_ombudsman_component := 0.10 * (p_ombudsman_filings::NUMERIC / p_cases_reported::NUMERIC) * 100;
    v_score := v_score + v_ombudsman_component;
  END IF;

  RETURN ROUND(LEAST(v_score, 100), 2);
END;
$$;

COMMENT ON FUNCTION public.compute_pressure_score IS 'v1 pressure_score formula; higher = more pressure on bank';

-- Upsert bank_scores snapshot for a bank
CREATE OR REPLACE FUNCTION public.refresh_bank_score_snapshot(
  p_bank_id UUID,
  p_snapshot_date DATE DEFAULT CURRENT_DATE,
  p_methodology_version TEXT DEFAULT 'v1'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sample_size INTEGER;
  v_cases_reported INTEGER;
  v_cases_open INTEGER;
  v_cases_resolved INTEGER;
  v_cases_resolved_positive INTEGER;
  v_median_days NUMERIC;
  v_release_rate NUMERIC;
  v_avg_sat NUMERIC;
  v_ombudsman INTEGER;
  v_pressure NUMERIC;
  v_is_public BOOLEAN;
  v_score_id UUID;
  v_metrics JSONB;
BEGIN
  -- Only cases that opted in to public stats
  SELECT
    COUNT(*) FILTER (WHERE c.public_stats_opt_in = TRUE),
    COUNT(*) FILTER (WHERE c.public_stats_opt_in = TRUE),
    COUNT(*) FILTER (WHERE c.public_stats_opt_in = TRUE AND c.status NOT IN ('closed', 'resolved')),
    COUNT(*) FILTER (WHERE c.public_stats_opt_in = TRUE AND c.status = 'resolved'),
    COUNT(*) FILTER (WHERE c.public_stats_opt_in = TRUE AND c.resolution_type IN (
      'full_unfreeze', 'partial_release', 'lien_lifted_innocent_receiver'
    ))
  INTO v_sample_size, v_cases_reported, v_cases_open, v_cases_resolved, v_cases_resolved_positive
  FROM public.cases c
  WHERE c.bank_id = p_bank_id;

  SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 86400)
  INTO v_median_days
  FROM public.cases c
  WHERE c.bank_id = p_bank_id
    AND c.public_stats_opt_in = TRUE
    AND c.resolution_type = 'full_unfreeze'
    AND c.resolved_at IS NOT NULL;

  SELECT
    CASE WHEN COUNT(*) FILTER (WHERE c.victim_role = 'innocent_receiver') > 0
      THEN COUNT(*) FILTER (
        WHERE c.victim_role = 'innocent_receiver'
          AND c.resolution_type IN ('lien_lifted_innocent_receiver', 'full_unfreeze', 'partial_release')
      )::NUMERIC / COUNT(*) FILTER (WHERE c.victim_role = 'innocent_receiver')::NUMERIC
      ELSE NULL
    END,
    AVG(c.satisfaction_score)::NUMERIC
  INTO v_release_rate, v_avg_sat
  FROM public.cases c
  WHERE c.bank_id = p_bank_id AND c.public_stats_opt_in = TRUE AND c.status = 'resolved';

  SELECT COUNT(*) INTO v_ombudsman
  FROM public.escalations e
  JOIN public.cases c ON c.id = e.case_id
  WHERE c.bank_id = p_bank_id
    AND c.public_stats_opt_in = TRUE
    AND e.channel = 'rbi_cms'
    AND e.status IN ('sent', 'response_received');

  v_pressure := public.compute_pressure_score(
    v_median_days, v_release_rate, v_cases_open, v_cases_reported,
    v_avg_sat, v_ombudsman
  );

  v_is_public := v_sample_size >= 5;

  v_metrics := jsonb_build_object(
    'median_days_full_unfreeze', v_median_days,
    'innocent_receiver_release_rate', v_release_rate,
    'cases_open_ratio', CASE WHEN v_cases_reported > 0 THEN v_cases_open::NUMERIC / v_cases_reported ELSE 0 END,
    'avg_satisfaction', v_avg_sat,
    'ombudsman_filings', v_ombudsman
  );

  INSERT INTO public.bank_scores (
    bank_id, snapshot_date, methodology_version,
    sample_size, cases_reported, cases_open, cases_resolved, cases_resolved_positive,
    median_days_full_unfreeze, innocent_receiver_release_rate, avg_satisfaction,
    ombudsman_filings, pressure_score, is_public, metrics_json, computed_at
  ) VALUES (
    p_bank_id, p_snapshot_date, p_methodology_version,
    v_sample_size, v_cases_reported, v_cases_open, v_cases_resolved, v_cases_resolved_positive,
    v_median_days, v_release_rate, v_avg_sat,
    v_ombudsman, v_pressure, v_is_public, v_metrics, now()
  )
  ON CONFLICT (bank_id, snapshot_date, methodology_version) DO UPDATE SET
    sample_size = EXCLUDED.sample_size,
    cases_reported = EXCLUDED.cases_reported,
    cases_open = EXCLUDED.cases_open,
    cases_resolved = EXCLUDED.cases_resolved,
    cases_resolved_positive = EXCLUDED.cases_resolved_positive,
    median_days_full_unfreeze = EXCLUDED.median_days_full_unfreeze,
    innocent_receiver_release_rate = EXCLUDED.innocent_receiver_release_rate,
    avg_satisfaction = EXCLUDED.avg_satisfaction,
    ombudsman_filings = EXCLUDED.ombudsman_filings,
    pressure_score = EXCLUDED.pressure_score,
    is_public = EXCLUDED.is_public,
    metrics_json = EXCLUDED.metrics_json,
    computed_at = now()
  RETURNING id INTO v_score_id;

  RETURN v_score_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- transition_case() — guarded state machine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transition_case(
  p_case_id       UUID,
  p_to_status     public.case_status,
  p_trigger       TEXT,
  p_actor_type    public.actor_type DEFAULT 'system',
  p_actor_id      TEXT DEFAULT NULL,
  p_payload_json  JSONB DEFAULT '{}'
)
RETURNS public.cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_case public.cases;
  v_from public.case_status;
  v_allowed BOOLEAN := FALSE;
BEGIN
  SELECT * INTO v_case FROM public.cases WHERE id = p_case_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'case_not_found' USING ERRCODE = 'P0002';
  END IF;

  v_from := v_case.status;

  IF v_from = p_to_status THEN
    RETURN v_case; -- idempotent no-op
  END IF;

  -- Valid transitions per BUILD_SPEC §4 state machine
  v_allowed := CASE
    WHEN v_from = 'new' AND p_to_status = 'intake_scoping' AND p_trigger = 'evidence.submitted' THEN TRUE
    WHEN v_from = 'intake_scoping' AND p_to_status = 'monitoring' AND p_trigger = 'intake.classified' THEN TRUE
    WHEN v_from = 'monitoring' AND p_to_status = 'evidence_building' AND p_trigger = 'checklist.complete' THEN TRUE
    WHEN v_from = 'monitoring' AND p_to_status = 'closed' AND p_trigger IN ('user.abandon', 'inactive_30d') THEN TRUE
    WHEN v_from = 'evidence_building' AND p_to_status = 'escalation' AND p_trigger = 'bundle.ready' THEN TRUE
    WHEN v_from = 'escalation' AND p_to_status = 'awaiting_response' AND p_trigger = 'user.mark_sent' THEN TRUE
    WHEN v_from = 'awaiting_response' AND p_to_status = 'verified' AND p_trigger IN ('response.received', 'user.confirm_unfreeze') THEN TRUE
    WHEN v_from = 'awaiting_response' AND p_to_status = 'escalation' AND p_trigger = 'response.timeout' THEN TRUE
    WHEN v_from = 'awaiting_response' AND p_to_status = 'stalled' AND p_trigger = 'inactive_45d' THEN TRUE
    WHEN v_from = 'verified' AND p_to_status = 'resolved' AND p_trigger = 'resolution.confirmed' THEN TRUE
    WHEN v_from = 'resolved' AND p_to_status = 'public_pressure' AND p_trigger = 'user.opt_in_stats' THEN TRUE
    WHEN v_from = 'resolved' AND p_to_status = 'closed' AND p_trigger = 'bundle.delivered' THEN TRUE
    WHEN v_from = 'stalled' AND p_to_status = 'retried' AND p_trigger = 'user.reopen' THEN TRUE
    WHEN v_from = 'retried' AND p_to_status = 'escalation' AND p_trigger = 'new.strategy' THEN TRUE
    WHEN v_from = 'escalation' AND p_to_status = 'human_escalation'
      AND p_trigger IN ('low_confidence', 'cost_cap', 'user.request') THEN TRUE
    WHEN v_from = 'human_escalation' AND p_to_status = 'closed' AND p_trigger = 'ops.handoff' THEN TRUE
    -- Operator overrides
    WHEN public.is_operator() AND p_trigger LIKE 'ops.%' THEN TRUE
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'invalid_transition: % -> % via %', v_from, p_to_status, p_trigger
      USING ERRCODE = 'P0001',
            HINT = jsonb_build_object('error', 'guard_failed', 'from', v_from, 'to', p_to_status, 'trigger', p_trigger)::TEXT;
  END IF;

  -- Guard: mark_sent requires prior level proof for L2+
  IF p_trigger = 'user.mark_sent' AND (p_payload_json->>'escalation_level') IN ('L2', 'L3', 'L4') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.escalations e
      WHERE e.case_id = p_case_id
        AND e.level = CASE (p_payload_json->>'required_proof')
          WHEN 'L1' THEN 'L1'::public.escalation_level
          WHEN 'L2' THEN 'L2'::public.escalation_level
          ELSE 'L1'::public.escalation_level
        END
        AND e.status IN ('sent', 'response_received', 'timeout')
    ) THEN
      RAISE EXCEPTION 'guard_failed: has_prior_level_proof'
        USING ERRCODE = 'P0001',
              HINT = '{"error":"guard_failed","guard":"has_prior_level_proof"}';
    END IF;
  END IF;

  -- Guard: resolved requires confirmation
  IF p_to_status = 'resolved' THEN
    IF NOT (
      (p_payload_json->>'resolution_confirmed_by') IS NOT NULL
      OR EXISTS (
        SELECT 1 FROM public.evidence ev
        WHERE ev.case_id = p_case_id
          AND ev.evidence_type = 'bank_release_letter'
          AND ev.deleted_at IS NULL
      )
    ) THEN
      RAISE EXCEPTION 'guard_failed: resolution_proof_required'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.cases SET
    status = p_to_status,
    last_activity_at = now(),
    resolved_at = CASE WHEN p_to_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN p_to_status = 'closed' THEN now() ELSE closed_at END,
    stalled_at = CASE WHEN p_to_status = 'stalled' THEN now() ELSE stalled_at END,
    resolution_type = COALESCE((p_payload_json->>'resolution_type')::public.resolution_type, resolution_type),
    resolution_confirmed_by = COALESCE(p_payload_json->>'resolution_confirmed_by', resolution_confirmed_by),
    released_amount_paise = COALESCE((p_payload_json->>'released_amount_paise')::BIGINT, released_amount_paise)
  WHERE id = p_case_id
  RETURNING * INTO v_case;

  INSERT INTO public.action_logs (case_id, actor_type, actor_id, action, payload_json)
  VALUES (
    p_case_id, p_actor_type, p_actor_id,
    'transition.' || p_to_status,
    jsonb_build_object('from', v_from, 'to', p_to_status, 'trigger', p_trigger) || COALESCE(p_payload_json, '{}')
  );

  PERFORM public.append_swarm_event(
    p_case_id, 'MONITOR', 'status_transition',
    format('Case moved from %s to %s', v_from, p_to_status),
    'info', NULL,
    jsonb_build_object('from', v_from, 'to', p_to_status, 'trigger', p_trigger)
  );

  RETURN v_case;
END;
$$;

COMMENT ON FUNCTION public.transition_case IS 'Guarded state machine; raises guard_failed on invalid transitions';

-- Hash helper for guest tokens
CREATE OR REPLACE FUNCTION public.hash_token(p_token TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(extensions.digest(p_token, 'sha256'), 'hex');
$$;

-- Increment agent cost on job completion
CREATE OR REPLACE FUNCTION public.sync_agent_cost_on_job_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.cases
    SET agent_cost_usd = agent_cost_usd + COALESCE(NEW.cost_usd, 0)
    WHERE id = NEW.case_id;

    IF (SELECT agent_cost_usd >= agent_cost_cap_usd FROM public.cases WHERE id = NEW.case_id) THEN
      PERFORM public.append_swarm_event(
        NEW.case_id, 'HUMAN_OPS', 'cost_cap_hit',
        'Agent cost cap reached; routing to human escalation',
        'human_required'
      );
      INSERT INTO public.human_gate_queue (case_id, queue_reason, priority)
      SELECT NEW.case_id, 'agent_cost_cap', 80
      WHERE NOT EXISTS (
        SELECT 1 FROM public.human_gate_queue hg
        WHERE hg.case_id = NEW.case_id
          AND hg.queue_reason = 'agent_cost_cap'
          AND hg.status = 'pending'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agent_jobs_cost_sync
  AFTER UPDATE OF status ON public.agent_jobs
  FOR EACH ROW EXECUTE FUNCTION public.sync_agent_cost_on_job_complete();