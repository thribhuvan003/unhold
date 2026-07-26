-- 022: mark_sent may leave prep statuses (intake_scoping, monitoring, ...).
-- Letter product path often never sets case.status = escalation before mark-sent.

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
  -- Authorization guard (added in 018). service_role is trusted (route-level auth);
  -- everyone else must hold editor access or be an operator.
  IF COALESCE(auth.jwt() ->> 'role', '') <> 'service_role'
     AND NOT public.is_operator()
     AND NOT public.has_case_access(p_case_id, 'editor') THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501',
            HINT = '{"error":"forbidden","guard":"case_access"}';
  END IF;

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
    WHEN v_from IN ('new', 'intake_scoping', 'monitoring', 'evidence_building', 'escalation', 'retried')
      AND p_to_status = 'awaiting_response'
      AND p_trigger = 'user.mark_sent' THEN TRUE
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
          WHEN 'L3' THEN 'L3'::public.escalation_level
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

COMMENT ON FUNCTION public.transition_case IS
  'Guarded state machine; mark_sent allowed from prep statuses (022).';
