# Unhold

**A case workspace for bank-account and UPI freezes in India.**

Live: [unhold.live](https://www.unhold.live) · Demo (no account): [unhold.live/demo](https://www.unhold.live/demo)

You record what happened, keep papers in one place, and get a letter draft to review. **You send everything.** Unhold never emails a bank or authority and never promises an unfreeze.

[![CI](https://github.com/thribhuvan003/unhold/actions/workflows/ci.yml/badge.svg)](https://github.com/thribhuvan003/unhold/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

If someone is losing money to fraud right now: **1930**.

---

## Why this exists

A freeze is confusing: SMS jargon, missing papers, no clear next step. Unhold is a **structured file** for that moment — not a law firm, not a bank tool, not an “unfreeze agent.”

Built as a solo product (public beta) to practise full-stack shipping under real constraints: privacy, honest copy, and no unsafe automation.

---

## Product flow

```text
Start (guest) → Papers → Draft letter → You review → You send → Mark sent + proof → Next level if needed
```

| Stage | What the system does | What you do |
| --- | --- | --- |
| Intake | Short questions → structured case facts | Answer honestly |
| Evidence | Private storage, hash check, readability flags | Upload; re-read every file |
| Draft | Case-aware letter text (template path always works) | Edit blanks, copy/print |
| Escalation | Later levels locked until prior send-proof exists | Mark sent with proof photo |
| Follow-up | Optional reminders if you opt in | Keep acknowledgements |

Safety contract: [`docs/PRODUCT_AND_SAFETY.md`](docs/PRODUCT_AND_SAFETY.md).

---

## Architecture

```text
┌─────────────┐     HTTPS      ┌──────────────────────┐
│   Browser   │ ─────────────► │  Next.js (App Router) │
│  session UI │                │  + /api/v1 routes     │
└─────────────┘                └──────────┬───────────┘
                                          │
                    ┌─────────────────────┼─────────────────────┐
                    ▼                     ▼                     ▼
            ┌──────────────┐    ┌─────────────────┐    ┌──────────────┐
            │  Supabase    │    │  agent_jobs     │    │ Private      │
            │  Postgres    │    │  (claim/retry)  │    │ object store │
            │  Auth only*  │    └────────┬────────┘    └──────────────┘
            └──────────────┘             │
                                         ▼
                               Intake · Verifier · Drafter
                               Bundle · Monitor
```

\* Browser Supabase client is for **auth only**. Case tables and RPCs are not exposed to `anon`/`authenticated`. Server routes use the service role after owner/guest/operator checks.

### Design choices (short)

| Decision | Rationale |
| --- | --- |
| No auto-send to banks | Legal + trust: user must own the send |
| Guest + recovery code | Low friction when someone is stressed; no forced signup |
| Deterministic proof gates | Later letters unlock only after prior send proof |
| Job queue + reclaim | Survives Hobby function timeouts and deploy kills |
| EN + HI | Matches real users in India |
| Mumbai (`bom1`) | Latency and data-residency posture |

### Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript (strict), next-intl |
| API | Route handlers under `/api/v1` |
| Data | Supabase Postgres + private Storage + RLS |
| Jobs | Postgres-backed queue; GitHub Actions every 5m + request-time kick |
| Hosting | Vercel (region `bom1`) |
| Tests | Vitest (unit + contract), Playwright (e2e smoke) |

---

## Repository layout

```text
app/                 App Router UI + versioned API
  [locale]/          Pages (en default, hi under /hi)
  api/v1/            Public and internal HTTP routes
  healthz/           Uptime JSON
components/          Mobile-first case UI
lib/
  agents/            Intake, verifier, drafter, evidence, monitor
  api/               Authz, errors, response helpers
  escalations/       Proof gates (deterministic)
  jobs/              Enqueue, claim, process, stale reclaim
  evidence/          Hash, mime, compress, vision prep
  state-machine/     Case status transitions (TS + SQL)
messages/            en.json · hi.json product copy
supabase/migrations/ Schema, policies, functions
tests/
  unit/              Domain + component tests
  contract/          API / migration contracts
  e2e/               Browser journeys
docs/                Product safety, deploy notes
config/              Env key catalogue
scripts/             Verify helpers, evals
proxy.ts             Next routing (locale + healthz)
```

---

## Local development

**Requires:** Node.js ≥ 22.14, pnpm 10.12.1

```bash
git clone https://github.com/thribhuvan003/unhold.git
cd unhold
pnpm install --frozen-lockfile
cp .env.example .env.local   # never commit secrets
# apply supabase/migrations/ to your project
pnpm dev
```

```bash
pnpm verify             # lint · types · unit · contracts · no-auto-send · build
pnpm test:e2e:smoke     # Playwright
```

Env reference: [`config/VERCEL_ENV_KEYS.md`](config/VERCEL_ENV_KEYS.md).

---

## Security posture

- No service-role keys in the browser
- Case data only via authenticated server routes
- Private evidence buckets; size/type limits on upload
- Optional AI/OCR only with consent; template path works without it
- Report vulnerabilities privately: [`SECURITY.md`](SECURITY.md)

---

## Status

Public beta **0.1.0**. Sharp edges expected.

Document extraction can be wrong. Process guidance can go stale. Outcomes are decided only by the bank and ordering authority.

---

## Author

Built and maintained by [thribhuvan003](https://github.com/thribhuvan003).  
Contributing: [`CONTRIBUTING.md`](CONTRIBUTING.md).

MIT License
