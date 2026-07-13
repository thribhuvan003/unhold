import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260713194008_server_only_data_boundary.sql",
  ),
  "utf8",
);
const approveRoute = readFileSync(
  resolve(
    process.cwd(),
    "app/api/v1/cases/[id]/escalations/[eid]/approve/route.ts",
  ),
  "utf8",
);
const markSentRoute = readFileSync(
  resolve(
    process.cwd(),
    "app/api/v1/cases/[id]/escalations/[eid]/mark-sent/route.ts",
  ),
  "utf8",
);

describe("server-only database boundary migration", () => {
  it("removes direct table, sequence, and RPC access from browser JWT roles", () => {
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon, authenticated",
    );
    expect(migration).toContain(
      "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated",
    );
  });

  it("keeps server access explicit and future objects private by default", () => {
    expect(migration).toContain(
      "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role",
    );
    expect(migration).toContain(
      "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public",
    );
    expect(migration).toContain("GRANT EXECUTE ON FUNCTIONS TO service_role");
  });

  it("hardens views and privileged profile roles", () => {
    expect(migration).toContain(
      "ALTER VIEW public.v_case_timeline SET (security_invoker = true)",
    );
    expect(migration).toContain(
      "ALTER VIEW public.v_public_bank_rankings SET (security_invoker = true)",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION private.protect_profile_role()",
    );
    expect(migration).toContain(
      "DROP POLICY IF EXISTS guest_sessions_insert_anon",
    );
  });

  it("uses canonical case access and scopes every escalation read/update to its case", () => {
    for (const source of [approveRoute, markSentRoute]) {
      expect(source).toContain("requireRequestAuth(request)");
      expect(source).toMatch(
        /assertCaseAccess\(params\.id, auth, ["']editor["']\)/,
      );
      expect(source).not.toContain("@/lib/auth/case-access");
      const scopedQueries = source.match(
        /\.eq\(["']id["'], params\.eid\)\s*\.eq\(["']case_id["'], params\.id\)/g,
      );
      expect(scopedQueries?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});
