-- Controlled case erasure. Append-only tables remain immutable for every
-- caller except this service-role-only purge transaction.

CREATE OR REPLACE FUNCTION public.deny_action_logs_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.case_erasure', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'action_logs is append-only; % not permitted', TG_OP;
END;
$$;

CREATE OR REPLACE FUNCTION public.deny_consent_records_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('app.case_erasure', true) = 'true' THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'consent_records is append-only; % not permitted', TG_OP;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_case_for_erasure(p_case_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_requested_at TIMESTAMPTZ;
BEGIN
  SELECT erasure_requested_at
    INTO v_requested_at
    FROM public.cases
   WHERE id = p_case_id
   FOR UPDATE;

  IF NOT FOUND OR v_requested_at IS NULL THEN
    RETURN FALSE;
  END IF;

  PERFORM set_config('app.case_erasure', 'true', true);

  DELETE FROM public.consent_records WHERE case_id = p_case_id;
  DELETE FROM public.audit_seals WHERE case_id = p_case_id;
  DELETE FROM public.action_logs WHERE case_id = p_case_id;
  DELETE FROM public.cases WHERE id = p_case_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_case_for_erasure(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_case_for_erasure(UUID) TO service_role;

-- Claim a job only while its case is active. Locking the case row serializes
-- this claim with an erasure request, so erasure cannot miss a new runner.
CREATE OR REPLACE FUNCTION public.claim_agent_job_for_processing(
  p_job_id UUID,
  p_started_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_case_id UUID;
BEGIN
  SELECT c.id
    INTO v_case_id
    FROM public.agent_jobs j
    JOIN public.cases c ON c.id = j.case_id
   WHERE j.id = p_job_id
     AND j.status = 'pending'
     AND c.erasure_requested_at IS NULL
     AND c.swarm_paused = FALSE
   FOR UPDATE OF c;

  IF v_case_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.agent_jobs
     SET status = 'running',
         started_at = p_started_at,
         attempts = attempts + 1
   WHERE id = p_job_id
     AND status = 'pending';

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_agent_job_for_processing(UUID, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agent_job_for_processing(UUID, TIMESTAMPTZ) TO service_role;
