-- =============================================================================
-- Unhold — Migration 018: Lock down SECURITY DEFINER function EXECUTE grants
-- =============================================================================
-- WHY
-- Postgres grants EXECUTE to the PUBLIC role on every function by default, and no
-- prior migration ever revoked it. Because PostgREST exposes any function in the
-- `public` schema as an RPC (`/rest/v1/rpc/<fn>`), the anon/authenticated API keys
-- could call privileged SECURITY DEFINER functions directly. Confirmed abuse paths:
--
--   * transition_case()          — drives a case through the state machine but only
--                                  checks the state-machine guard, NOT case access.
--                                  Any caller with a case UUID could close or falsely
--                                  mark-verified another tenant's case.
--   * append_swarm_event()       — inserts swarm_events and mirrors into the
--                                  append-only action_logs. anon could forge audit
--                                  entries. Only the server (service role) calls it.
--   * refresh_bank_score_snapshot() / refresh_leaderboard_mv()
--                                — privileged writes / MV refresh (DoS). Only the
--                                  rankings cron calls them, via the service role.
--
-- FIX
--   1. transition_case(): add a case-access authorization guard AND revoke its
--      client-callable EXECUTE (defense in depth).
--   2. Systemically REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC,
--      anon and authenticated — closing the default-grant hole in one shot.
--   3. Re-GRANT EXECUTE only to the roles that genuinely need each function when a
--      request runs with a USER/ANON JWT (not the service role, which bypasses
--      grants). See the per-grant notes below. Everything else stays revoked.
--
-- SAFETY NOTES
--   * The service_role bypasses GRANTs, so every server-side admin-client call
--     (transition_case, append_swarm_event, refresh_*, match_knowledge_chunks)
--     keeps working after the revokes.
--   * Trigger functions (RETURNS TRIGGER) are executed by the trigger machinery,
--     not privilege-checked against the invoking role, so they need no grant.
--   * Extension-owned functions (e.g. pgvector's operator support functions, if the
--     `vector` extension was installed into `public`) MUST keep their PUBLIC
--     EXECUTE or vector operators break for anon/authenticated. Step 2b restores
--     those specifically after the blanket revoke.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. transition_case(): add authorization guard (reproduces 009 body verbatim
--    plus the guard). EXECUTE is revoked from clients in step 3.
--
--    The guard denies any caller that lacks editor-level case access and is not
--    an operator. The service_role admin client authenticates the user in the API
--    layer and carries no auth.uid(), so has_case_access() would (correctly) deny
--    it; we therefore let the service_role through and rely on route-level auth.
--    This preserves the two confirmed callers (lib/state-machine/transition.ts and
--    transitions.ts, both createAdminClient()) while blocking direct anon/
--    authenticated RPC abuse.
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

COMMENT ON FUNCTION public.transition_case IS 'Guarded state machine; 018 added case-access authorization guard (service_role bypass). Raises forbidden on missing access, guard_failed on invalid transitions';

-- ---------------------------------------------------------------------------
-- 2a. Systemic revoke: strip the default PUBLIC grant AND any explicit anon /
--     authenticated grants (from migration 010) on every public function.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- ---------------------------------------------------------------------------
-- 2b. Restore EXECUTE to PUBLIC on extension-owned functions in `public`
--     (functions with a pg_depend 'e' dependency, e.g. pgvector). The blanket
--     revoke above would otherwise break vector operators for anon/authenticated.
--     Our own functions have no extension dependency and stay revoked.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO PUBLIC', r.fn);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Re-grant EXECUTE only where a request legitimately runs with a USER/ANON JWT.
--
--    RLS-policy helpers: referenced by RLS USING/WITH CHECK expressions in
--    migrations 010/011, which Postgres evaluates AS THE QUERYING ROLE. Without
--    EXECUTE, every anon/authenticated query on RLS-protected tables (cases,
--    evidence, ...) fails with "permission denied for function". These functions
--    only ever act on the caller's own identity/access, so the grant is safe.
-- ---------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_operator() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_guest_session_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_case_access(uuid, public.permission_level) TO anon, authenticated;

--    Column DEFAULT helper: cases.public_id DEFAULTs to generate_case_public_id()
--    (migration 004), and anon/authenticated hold INSERT on public.cases. DEFAULT
--    expressions are evaluated as the inserting role, so without EXECUTE every
--    case insert fails. Function is SECURITY INVOKER and only bumps a sequence.
GRANT EXECUTE ON FUNCTION public.generate_case_public_id() TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Intentionally NOT re-granted (service-role-only or internal; stay revoked):
--   transition_case            — admin client only (both callers) + guard above
--   append_swarm_event         — admin client only
--   refresh_bank_score_snapshot— rankings cron (admin client) only
--   refresh_leaderboard_mv     — rankings cron (admin client) only
--   match_knowledge_chunks     — RAG retrieval via admin client only
--   compute_pressure_score     — called only inside refresh_bank_score_snapshot
--                                (SECURITY DEFINER; runs as owner)
--   hash_token                 — no client RPC / policy / default references it
--   set_updated_at, handle_new_user, grant_case_owner_permission,
--   deny_action_logs_mutation, deny_consent_records_mutation,
--   sync_agent_cost_on_job_complete — trigger functions; no grant needed
-- ---------------------------------------------------------------------------

COMMIT;
