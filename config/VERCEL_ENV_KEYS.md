# Vercel environment variables — quick reference

**Paste template (fill values locally, copy keys to Vercel):** [`vercel-env-paste.template`](./vercel-env-paste.template)

**Production URL:** `https://unholdd.vercel.app`

## Required for Phase 1 (14 keys)

| # | Key | Where to get value |
|---|-----|-------------------|
| 1 | `NEXT_PUBLIC_APP_URL` | `https://unholdd.vercel.app` |
| 2 | `NEXT_PUBLIC_APP_ENV` | `production` |
| 3 | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API → Project URL |
| 4 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → anon / publishable |
| 5 | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → service_role / secret |
| 6 | `GUEST_JWT_SECRET` | `openssl rand -base64 32` |
| 7 | `CRON_SECRET` | `openssl rand -base64 32` |
| 8 | `NVIDIA_API_KEY` | [build.nvidia.com](https://build.nvidia.com) → `nvapi-...` |
| 9 | `NVIDIA_API_BASE_URL` | `https://integrate.api.nvidia.com/v1/chat/completions` |
| 10 | `NVIDIA_MODEL` | `minimaxai/minimax-m3` |
| 11 | `UPSTASH_REDIS_REST_URL` | Upstash console → Redis → REST |
| 12 | `UPSTASH_REDIS_REST_TOKEN` | Upstash console → REST token |
| 13 | `LEADERBOARD_MIN_SAMPLE` | `5` |
| 14 | `LEADERBOARD_PUBLIC_ENABLED` | `false` |

Optional: `AGENT_COST_CAP_USD`, `AGENT_MAX_CONCURRENT`, Supermemory (section G in template).

## NVIDIA ≠ Supermemory

| Service | Env var | Key shape | Used for |
|---------|---------|-----------|----------|
| **NVIDIA** MiniMax-M3 | `NVIDIA_API_KEY` | `nvapi-...` | INTAKE, DRAFTER, VERIFIER agents (`lib/llm/nvidia.ts`) |
| **Supermemory** | `SUPERMEMORY_API_KEY` | Supermemory's own key | Claude harness memory only — optional in prod |

**Never put the same string in both.**

## Wrong names (delete from Vercel)

- `SUPABASE_SECRET_KEY` → use `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PUBLISHABLE_KEY` → use `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` → use `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_JWKS_URL` → not used by app