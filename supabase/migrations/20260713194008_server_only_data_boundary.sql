-- Make the Next.js API the only data boundary for Unhold.
--
-- Browser Supabase clients are used for authentication only. All application
-- data reads and writes happen after an explicit API authorization check and
-- use the service-role client. Keeping direct Data API grants would duplicate
-- that policy in two places and previously allowed profile-role escalation.

BEGIN;

-- Views must obey the caller's permissions if a grant is ever added later.
ALTER VIEW public.v_case_timeline SET (security_invoker = true);
ALTER VIEW public.v_public_bank_rankings SET (security_invoker = true);

-- Remove every direct table/sequence path for public API JWT roles. This also
-- removes access to the materialized leaderboard view. RLS remains enabled as
-- defence in depth, but it is no longer the primary application boundary.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- The service role is the sole application data role. These explicit grants
-- avoid relying on role inheritance or Supabase project defaults.
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Public-schema functions are not browser RPCs. Revoke the PostgreSQL default
-- PUBLIC EXECUTE grant and grant only the server role. Extension-owned helper
-- functions (for example pgvector operator support) retain PUBLIC EXECUTE.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

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

-- Do not silently expose future tables/functions through the Data API.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Remove the intentionally broad guest-session policy. The API creates guest
-- sessions with the service role after rate limiting and token hashing.
DROP POLICY IF EXISTS guest_sessions_insert_anon ON public.guest_sessions;

-- A second layer against role escalation if a table grant is accidentally
-- reintroduced. Ordinary sign-up may create a member profile; only trusted DB
-- or service-role sessions may assign or change privileged roles.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.protect_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin')
     OR COALESCE(auth.jwt() ->> 'role', '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.role = 'member'::public.user_role THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.role IS NOT DISTINCT FROM OLD.role THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'profile role changes require service authorization'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_role ON public.profiles;
CREATE TRIGGER trg_profiles_protect_role
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION private.protect_profile_role();

-- Fix mutable search_path findings on invoker functions. SECURITY DEFINER
-- functions already declare their paths in the migrations that define them.
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_case_public_id() SET search_path = public, pg_temp;
ALTER FUNCTION public.current_guest_session_id() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.compute_pressure_score(numeric, numeric, integer, integer, numeric, integer)
  SET search_path = public, pg_temp;
ALTER FUNCTION public.hash_token(text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.match_knowledge_chunks(vector, integer)
  SET search_path = public, extensions, pg_temp;

COMMIT;
