# Deploy on Vercel Hobby (free) — canonical for owner now

**Audience:** Owner + Claude (L0/L1 DEVOPS). Read this before changing `vercel.json` crons.

## Why this file exists

| Event | Decision |
|-------|----------|
| Netlify (`unholdd.netlify.app`) | Account **out of credits** — deploys disabled |
| Vercel Pro upsell ($20–30/mo) | **Not required** for hosting — only for built-in crons more than once/day |
| Owner choice (2026-06) | **Vercel Hobby (free)** + **external scheduler** for frequent crons |

Claude: do **not** restore `*/15` or `*/5` entries to `vercel.json` without owner explicitly upgrading to Vercel Pro or choosing another host.

## What changed in `vercel.json` (and why)

**Removed from `crons` array (commit message: Hobby-safe crons):**

| Path | Old schedule | Why removed |
|------|--------------|-------------|
| `/api/v1/internal/cron/tick` | `*/15 * * * *` | Vercel Hobby **rejects** deploy if any cron runs more than once per day |
| `/api/v1/internal/jobs/process` | `*/5 * * * *` | Same — Hobby limit |

**Kept in `crons` array (daily = Hobby-allowed):**

| Path | Schedule | Meaning |
|------|----------|---------|
| `/api/v1/internal/cron/reminders` | `30 3 * * *` | 09:00 IST daily |
| `/api/v1/internal/cron/rankings` | `30 20 * * *` | 02:00 IST daily (slice-16 route exists) |

**Removed:** `functionFailoverRegions: ["sin1"]` — **Enterprise-only** (passive failover). Hobby deploy fails with *"passive regions is restricted to the Enterprise plan"* if present.

**Unchanged:** `functions` block, `regions: ["bom1"]` (single region — Hobby limit; close to Supabase ap-south-1), security `headers`, `/healthz` rewrite.

**Routes still exist** — only Vercel's *scheduler* was trimmed. Tick and jobs/process must be invoked by an **external** POST with `Authorization: Bearer $CRON_SECRET`.

## Owner deploy steps (Vercel Hobby)

1. [vercel.com](https://vercel.com) → Import `thribhuvan003/unhold`
2. Plan: **Hobby** (not Pro)
3. **Root directory:** `lienliberator`
4. Environment variables — exact names from `.env.example` (see `docs/DEPLOY_NETLIFY.md` env table; names are identical)
5. Deploy → set `NEXT_PUBLIC_APP_URL` to the `*.vercel.app` URL → redeploy once
6. Supabase → Authentication → Site URL + Redirect URLs → your Vercel URL

## External crons (required for tick + jobs on Hobby)

Use [cron-job.org](https://cron-job.org) or Upstash QStash — **free**.

Method: **POST**  
Header: `Authorization: Bearer <CRON_SECRET>` (same value as Vercel env var)

| Endpoint | Schedule | Required on Hobby? |
|----------|----------|-------------------|
| `https://<APP_URL>/api/v1/internal/cron/tick` | every 15 min | **Yes** |
| `https://<APP_URL>/api/v1/internal/jobs/process` | every 5 min | **Yes** |
| `https://<APP_URL>/api/v1/internal/cron/reminders` | `30 3 * * *` UTC | Optional (also in vercel.json) |
| `https://<APP_URL>/api/v1/internal/cron/rankings` | `30 20 * * *` UTC | Optional (also in vercel.json) |

Test: `curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://<APP_URL>/api/v1/internal/cron/tick` → expect **200**, not **401**.

## If owner upgrades to Vercel Pro later

May restore full BUILD_SPEC §15 schedules in `vercel.json`:

```json
{ "path": "/api/v1/internal/cron/tick", "schedule": "*/15 * * * *" },
{ "path": "/api/v1/internal/jobs/process", "schedule": "*/5 * * * *" }
```

Then external tick/jobs schedulers become optional duplicates — remove them to avoid double-firing.

## Claude rules

- **Do not** tell owner Pro is required for deploy on Hobby.
- **Do not** re-add `functionFailoverRegions` — Enterprise only.
- **Do not** re-add frequent crons to `vercel.json` on Hobby without ADR + owner approval.
- **Do** cite this file when REVIEWER/DEVOPS questions cron config.
- Netlify `netlify.toml` remains for reference; **primary deploy target is Vercel Hobby** until owner changes ADR.

## Related

- `vercel.json` — source of truth for Vercel crons
- `docs/DEPLOY_NETLIFY.md` — Netlify + shared env var names
- `.claude/session/prod-health/plan.md` — production 500 diagnosis (guest/sessions)
- `MANIFEST.json` → `memory.decisions` ADR-DEPLOY-001