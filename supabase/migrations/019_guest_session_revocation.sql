-- Make guest-session recovery and revocation enforceable server-side.
ALTER TABLE public.guest_sessions
  ADD COLUMN revoked_at TIMESTAMPTZ,
  ADD COLUMN revocation_reason TEXT,
  ADD COLUMN rotated_at TIMESTAMPTZ;

ALTER TABLE public.guest_sessions
  ADD CONSTRAINT guest_sessions_revocation_consistency CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR revoked_at IS NOT NULL
  );

COMMENT ON COLUMN public.guest_sessions.revoked_at IS 'Blocks all guest-cookie access immediately.';
COMMENT ON COLUMN public.guest_sessions.rotated_at IS 'Last successful recovery-token rotation.';
