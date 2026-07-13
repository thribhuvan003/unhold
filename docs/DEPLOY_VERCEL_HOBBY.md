# Deploy on Vercel Hobby

This is the maintained deployment topology for the public beta.

## Why this file exists

| Event              | Decision                                             |
| ------------------ | ---------------------------------------------------- |
| Hosting            | Vercel Hobby                                         |
| Daily schedules    | Two Vercel cron entries in `vercel.json`             |
| Frequent schedules | GitHub Actions workflow `.github/workflows/cron.yml` |

Do not restore frequent entries to `vercel.json` without first checking the active Vercel plan and limits.

## What changed in `vercel.json` (and why)

**Removed from `crons` array (commit message: Hobby-safe crons):**

| Path                            | Old schedule   | Why removed                                                             |
| ------------------------------- | -------------- | ----------------------------------------------------------------------- |
| `/api/v1/internal/cron/tick`    | `*/15 * * * *` | Vercel Hobby **rejects** deploy if any cron runs more than once per day |
| `/api/v1/internal/jobs/process` | `*/5 * * * *`  | Same — Hobby limit                                                      |

**Kept in `crons` array (daily = Hobby-allowed):**

| Path                              | Schedule      | Meaning                                 |
| --------------------------------- | ------------- | --------------------------------------- |
| `/api/v1/internal/cron/reminders` | `30 3 * * *`  | 09:00 IST daily                         |
| `/api/v1/internal/cron/rankings`  | `30 20 * * *` | 02:00 IST daily (slice-16 route exists) |

**Removed:** `functionFailoverRegions: ["sin1"]` — **Enterprise-only** (passive failover). Hobby deploy fails with _"passive regions is restricted to the Enterprise plan"_ if present.

**Unchanged:** `functions` block, `regions: ["bom1"]` (single region — Hobby limit; close to Supabase ap-south-1), security `headers`, `/healthz` rewrite.

**Routes still exist** — only Vercel's _scheduler_ was trimmed. Tick and jobs/process must be invoked by an **external** POST with `Authorization: Bearer $CRON_SECRET`.

## Owner deploy steps (Vercel Hobby)

1. [vercel.com](https://vercel.com) → Import `thribhuvan003/unhold`
2. Plan: **Hobby**
3. **Root directory:** repository root
4. Create environment values from **`.env.example`** and **`config/VERCEL_ENV_KEYS.md`**; never upload a filled environment file to Git
5. Deploy → set `NEXT_PUBLIC_APP_URL` to the `*.vercel.app` URL → redeploy once
6. Supabase → Authentication → Site URL + Redirect URLs → your Vercel URL

## External crons (required for tick + jobs on Hobby)

The repository's GitHub Actions workflow is the default external scheduler. Configure repository secrets
`APP_URL=https://www.unhold.live` and `CRON_SECRET` (the same value used by Vercel).

Method: **POST**  
Header: `Authorization: Bearer <CRON_SECRET>` (same value as Vercel env var)

| Endpoint                                           | Schedule          | Required on Hobby?             |
| -------------------------------------------------- | ----------------- | ------------------------------ |
| `https://<APP_URL>/api/v1/internal/cron/tick`      | every 10 min      | **Yes**                        |
| `https://<APP_URL>/api/v1/internal/jobs/process`   | every 10 min      | **Yes**                        |
| `https://<APP_URL>/api/v1/internal/cron/reminders` | `30 3 * * *` UTC  | Optional (also in vercel.json) |
| `https://<APP_URL>/api/v1/internal/cron/rankings`  | `30 20 * * *` UTC | Optional (also in vercel.json) |

Test: `curl -i -X POST -H "Authorization: Bearer $CRON_SECRET" https://<APP_URL>/api/v1/internal/cron/tick` → expect **200**, not **401**.

## If owner upgrades to Vercel Pro later

May restore full BUILD_SPEC §15 schedules in `vercel.json`:

```json
{ "path": "/api/v1/internal/cron/tick", "schedule": "*/15 * * * *" },
{ "path": "/api/v1/internal/jobs/process", "schedule": "*/5 * * * *" }
```

Then external tick/jobs schedulers become optional duplicates — remove them to avoid double-firing.

## Change rules

- **Do not** re-add `functionFailoverRegions` — Enterprise only.
- **Do not** re-add frequent crons to `vercel.json` on Hobby without ADR + owner approval.
- **Do** keep only one frequent scheduler active to avoid duplicate work.

## Related

- `vercel.json` — source of truth for Vercel crons
- `.github/workflows/cron.yml` — frequent authenticated schedules
- `config/VERCEL_ENV_KEYS.md` — deployment key reference
