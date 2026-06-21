# Canonical Paths — Avoid Duplicate Confusion

If you see two copies of the same thing, use the **lienliberator/** path only.

| Artifact | ✅ Canonical | ❌ Ignore |
|----------|-------------|-----------|
| BUILD_SPEC | `lienliberator/docs/BUILD_SPEC.md` | `/2/BUILD_SPEC.md` |
| BUILD_SPEC_AGENTS | `lienliberator/docs/BUILD_SPEC_AGENTS.md` | `/2/BUILD_SPEC_AGENTS.md` |
| Migrations | `lienliberator/supabase/migrations/` | `/2/supabase/migrations/` |
| App code | `lienliberator/app/`, `lib/`, `components/` | — |
| Env template | `lienliberator/.env.example` | `/2/.env.example` (Supermemory) |
| Claude rules | `lienliberator/CLAUDE.md` + `/2/CLAUDE.md` | Both point to app root |