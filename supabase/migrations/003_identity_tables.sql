-- =============================================================================
-- LienLiberator — Migration 003: Identity (profiles, guest_sessions, permissions)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- profiles (extends auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone                 TEXT,
  email                 TEXT,
  full_name             TEXT,
  role                  public.user_role NOT NULL DEFAULT 'citizen',
  locale                TEXT NOT NULL DEFAULT 'en-IN',
  timezone              TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  consent_at            TIMESTAMPTZ,
  marketing_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
  public_stats_opt_in   BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_url            TEXT,
  metadata_json         JSONB NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT profiles_phone_format CHECK (phone IS NULL OR phone ~ '^\+[1-9]\d{6,14}$'),
  CONSTRAINT profiles_locale_format CHECK (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

COMMENT ON TABLE public.profiles IS 'Authenticated user profile; 1:1 with auth.users';
COMMENT ON COLUMN public.profiles.role IS 'citizen default; operator/admin for ops queue';
COMMENT ON COLUMN public.profiles.consent_at IS 'Timestamp of first terms+privacy acceptance';
COMMENT ON COLUMN public.profiles.public_stats_opt_in IS 'Default OFF per DPDP; case-level override exists';

CREATE INDEX idx_profiles_role ON public.profiles (role) WHERE role IN ('operator', 'admin');
CREATE INDEX idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name')
  );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS 'auth.users INSERT trigger: creates matching profiles row';

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- guest_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.guest_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_token_hash   TEXT NOT NULL,
  ip_hash             TEXT,
  user_agent_hash     TEXT,
  claimed_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  claimed_at          TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ NOT NULL,
  last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata_json       JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT guest_sessions_token_hash_unique UNIQUE (device_token_hash),
  CONSTRAINT guest_sessions_claim_consistency CHECK (
    (claimed_by IS NULL AND claimed_at IS NULL)
    OR (claimed_by IS NOT NULL AND claimed_at IS NOT NULL)
  )
);

COMMENT ON TABLE public.guest_sessions IS 'Anonymous intake sessions; raw device_token NEVER stored';
COMMENT ON COLUMN public.guest_sessions.device_token_hash IS 'SHA-256 of X-Guest-Token header value';
COMMENT ON COLUMN public.guest_sessions.expires_at IS 'Default 90 days; extend on activity';
COMMENT ON COLUMN public.guest_sessions.claimed_by IS 'Set when guest merges to authenticated user';

CREATE INDEX idx_guest_sessions_expires ON public.guest_sessions (expires_at);
CREATE INDEX idx_guest_sessions_claimed ON public.guest_sessions (claimed_by) WHERE claimed_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- permissions (scoped case access)
-- ---------------------------------------------------------------------------
CREATE TABLE public.permissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL, -- FK added in 004 after cases table
  grantee_user_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  permission_level  public.permission_level NOT NULL DEFAULT 'viewer',
  granted_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at        TIMESTAMPTZ,
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT permissions_unique_grant UNIQUE (case_id, grantee_user_id),
  CONSTRAINT permissions_revoke_consistency CHECK (
    revoked_at IS NULL OR expires_at IS NULL OR revoked_at <= expires_at
  )
);

COMMENT ON TABLE public.permissions IS 'Share links: parent_readonly, co-editor, etc.';
COMMENT ON COLUMN public.permissions.permission_level IS 'owner set on case claim; editor can upload evidence';
COMMENT ON COLUMN public.permissions.expires_at IS 'NULL = no expiry for parent_readonly links';

CREATE INDEX idx_permissions_grantee ON public.permissions (grantee_user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_permissions_case ON public.permissions (case_id) WHERE revoked_at IS NULL;