# Deploy runbooks (owner)

**Primary deploy (2026-06):** [DEPLOY_VERCEL_HOBBY.md](./DEPLOY_VERCEL_HOBBY.md) — Vercel Hobby free + external crons.

---

# Deploy on Netlify (owner runbook — paused: credits exhausted)

Unhold was built for Vercel (`vercel.json`). Netlify uses `netlify.toml` + OpenNext adapter instead.

## Netlify site settings

| Setting | Value |
|---------|--------|
| Base directory | `lienliberator` (if repo root is parent workspace) |
| Build command | (from `netlify.toml`) `pnpm install --frozen-lockfile && pnpm run build` |
| Node | 22.x |

## Environment variables

See `.env.example` and use **exact** names:

- `NEXT_PUBLIC_APP_URL` — your `https://*.netlify.app` URL
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GUEST_JWT_SECRET`, `CRON_SECRET` (≥32 chars, server-only)
- `NVIDIA_API_KEY`, `NVIDIA_API_BASE_URL`, `NVIDIA_MODEL`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `LEADERBOARD_PUBLIC_ENABLED=false`

Do **not** use `SUPABASE_PUBLISHABLE_KEY` — map to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Crons (required — vercel.json crons are ignored)

Schedule HTTP POST with header `Authorization: Bearer $CRON_SECRET`:

| Endpoint | Schedule |
|----------|----------|
| `/api/v1/internal/cron/tick` | `*/15 * * * *` |
| `/api/v1/internal/jobs/process` | `*/5 * * * *` |
| `/api/v1/internal/cron/reminders` | `30 3 * * *` (09:00 IST) |
| `/api/v1/internal/cron/rankings` | `30 20 * * *` (02:00 IST) |

Use [Upstash QStash](https://console.upstash.com) or [cron-job.org](https://cron-job.org).

## Post-deploy

```bash
curl https://YOUR-SITE.netlify.app/healthz
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://YOUR-SITE.netlify.app/api/v1/internal/cron/tick
```

Manual smoke: `/` → guest intake → case → evidence → L1 draft → mark-sent.