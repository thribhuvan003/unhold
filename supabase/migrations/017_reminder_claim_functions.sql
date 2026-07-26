-- Atomic claim-then-send for email deadline reminders.
--
-- Guarantees a single reminder per (case, deadline) no matter which caller
-- reaches it first — the daily cron and the case-tick hook hold DIFFERENT locks,
-- so the DB is the only correct arbiter. claim_reminder_send() flips the
-- intake_json.reminder_sent_due_at marker in ONE atomic statement and returns
-- true to exactly one caller; everyone else gets false and must not send.
--
-- jsonb_set touches a single key only — it never rewrites the whole intake_json,
-- so a concurrent opt-out cannot be clobbered / a withdrawn consent resurrected.

CREATE OR REPLACE FUNCTION public.claim_reminder_send(
  p_case_id uuid,
  p_due     timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed boolean;
BEGIN
  UPDATE public.cases
  SET intake_json = jsonb_set(
        COALESCE(intake_json, '{}'::jsonb),
        '{reminder_sent_due_at}',
        to_jsonb(p_due::text),
        true
      )
  WHERE id = p_case_id
    AND (intake_json->>'reminder_sent_due_at') IS DISTINCT FROM p_due::text
  RETURNING true INTO v_claimed;

  RETURN COALESCE(v_claimed, false);
END;
$$;

COMMENT ON FUNCTION public.claim_reminder_send(uuid, timestamptz) IS
  'Atomically claims the right to send ONE deadline reminder for (case, due). Returns true exactly once per deadline; false if already claimed.';

-- Release a claim (only if it is still ours) so a failed send retries later.
CREATE OR REPLACE FUNCTION public.release_reminder_send(
  p_case_id uuid,
  p_due     timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.cases
  SET intake_json = intake_json - 'reminder_sent_due_at'
  WHERE id = p_case_id
    AND (intake_json->>'reminder_sent_due_at') = p_due::text;
$$;

COMMENT ON FUNCTION public.release_reminder_send(uuid, timestamptz) IS
  'Releases a reminder claim (only when still ours) so a failed send is retried on a later run.';
