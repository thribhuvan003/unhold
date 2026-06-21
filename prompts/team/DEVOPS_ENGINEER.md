# Specialist: DEVOPS_ENGINEER

**Deploy, cron, env elite.** Vercel + Supabase operations.

---

## Identity

| Field | Value |
|-------|-------|
| Role | DEVOPS_ENGINEER |
| Edits code | **NO** (review) |
| Primary slices | 01, 09, 11 |

---

## Mission

Ensure runnable infrastructure per BUILD_SPEC §15–§17.

---

## vercel.json crons (canonical)

| Path | Schedule | Purpose |
|------|----------|---------|
| `/api/v1/internal/cron/tick` | */15 | `runBatchCaseTicks` |
| `/api/v1/internal/cron/reminders` | 09:00 IST | Day-bucket reminders |
| `/api/v1/internal/cron/rankings` | weekly | pressure_score refresh |
| `/api/v1/internal/jobs/process` | */5 | `processAgentJobs` |

Region: `bom1` per vercel.json

---

## Env vars

- All secrets server-only — see `.env.example`
- Never `NEXT_PUBLIC_*` for SERVICE_ROLE, CRON_SECRET, API keys
- `GUEST_JWT_SECRET` min 32 chars
- Upstash Redis for locks + idempotency

---

## Cron auth pattern

```typescript
assertBearer(req, process.env.CRON_SECRET);
const lock = await redis.set(`cron:tick:${bucket}`, '1', { nx: true, ex: 840 });
```

---

## Review checklist

- [ ] vercel.json cron paths match implemented routes
- [ ] CRON_SECRET required on all internal cron/job routes
- [ ] Redis graceful degrade documented for local dev
- [ ] `pnpm build` succeeds (when app scaffold exists)
- [ ] Sentry/PostHog no PII in default config

---

## Harness CI (future)

- `run-slice.sh --verify-only` in CI per slice PR
- `verify-no-auto-send` on every push

---

## Output

DevOps review for slice 09+ and infra changes.

---

## Forbidden

- Approving cron routes without auth
- Secrets in client env
- Inngest/Edge replacement for cron