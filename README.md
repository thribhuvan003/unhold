# Unhold

**Case workspace for bank-account and UPI freezes in India.**

| | |
|---|---|
| **Home** | [unhold.live](https://www.unhold.live) |
| **Demo** (no account) | [unhold.live/demo](https://www.unhold.live/demo) |

[![CI](https://github.com/thribhuvan003/unhold/actions/workflows/ci.yml/badge.svg)](https://github.com/thribhuvan003/unhold/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

You record what the bank told you, keep papers in one place, and prepare a letter draft. **You review and send everything yourself.** Unhold never emails a bank or authority, and never promises an unfreeze.

If money is being stolen right now: **1930**.

---

## Problem

A freeze hits with unclear SMS language, missing documents, and no clear “what next.” People either freeze (do nothing) or pay random “unfreeze agents.”

Unhold is a **structured case file** for that moment: facts → papers → draft → proof of send → next step. It is not a law firm, bank product, or government service.

---

## User journey

```text
Guest start → intake facts → upload papers → draft letter
    → you edit & send → mark sent + proof photo → optional next level
```

| Stage | System | User |
| --- | --- | --- |
| Intake | Short questions → structured case record | Answer in plain language |
| Papers | Private storage, SHA-256 confirm, readability flags | Upload; re-read every file |
| Letter | Case-aware draft (templates always work) | Fill blanks, copy / print / mail |
| Escalation | Later levels locked until prior send-proof exists | Mark sent with proof |
| Follow-up | Optional reminders if opted in | Keep acknowledgements |

Product rules: [`docs/PRODUCT_AND_SAFETY.md`](docs/PRODUCT_AND_SAFETY.md).

---

## Architecture

```text
                 ┌─────────────────────────────────────┐
  Browser  ────► │  Next.js 16 (App Router + /api/v1)   │
  (session UI)   └──────────────┬──────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
   ┌───────────────┐   ┌────────────────┐   ┌────────────────┐
   │ Supabase Auth │   │ Postgres       │   │ Private        │
   │ (browser OK)  │   │ cases, jobs,   │   │ object storage │
   └───────────────┘   │ escalations…   │   │ (evidence)     │
                       │ via service    │   └────────────────┘
                       │ role only*     │
                       └───────┬────────┘
                               │
                       agent_jobs queue
                       claim → run → complete / retry / dead-letter
                               │
              Intake · Verifier · Drafter · Bundle · Monitor
```

\* Application tables and RPCs are **not** granted to `anon` / `authenticated`. The browser client is for **auth only**. Case data goes through server routes after access checks.

### Request path (simplified)

1. Guest or user hits UI under `app/[locale]/…`
2. Mutations go to `/api/v1/...` with session or guest JWT
3. Route checks ownership / guest access → service-role Supabase client
4. Side work (OCR, draft) enqueues `agent_jobs`; cron + request-time kick drain the queue
5. State changes go through guarded transitions (TypeScript + SQL `transition_case`)

### Design decisions

| Choice | Why |
| --- | --- |
| No auto-send to banks | Legal + trust; user owns every send |
| Guest + recovery code | Low friction when someone is stressed |
| Proof gates | L2/L3 unlock only after prior send proof |
| Job reclaim | Hobby functions can time out; work must not stick forever |
| Template fallback | Letter path works if a model provider is down |
| EN + HI | Real users in India |
| Region `bom1` | Latency and India-first deploy |

### Stack

| Layer | Tech |
| --- | --- |
| UI | Next.js 16, React 19, TypeScript (strict), next-intl |
| API | App Router route handlers (`/api/v1`) |
| Data | Supabase Postgres, private Storage, RLS |
| Jobs | Postgres queue + GitHub Actions (5m) + kick on enqueue |
| Host | Vercel, Mumbai (`bom1`) |
| Tests | Vitest (unit + contract), Playwright (e2e smoke) |

---

## Repository structure

```text
unhold/
├── app/
│   ├── [locale]/          # Pages (en default; hi at /hi/…)
│   ├── api/v1/            # Versioned HTTP API
│   └── healthz/           # Uptime JSON
├── components/            # Case UI (papers, letters, intake, …)
├── lib/
│   ├── agents/            # Intake, verifier, drafter, evidence, monitor
│   ├── api/               # Authz, errors, response helpers
│   ├── escalations/       # Deterministic proof gates
│   ├── jobs/              # Enqueue, process, reclaim, kick
│   ├── evidence/          # Hash, mime, compress
│   ├── state-machine/     # Case status rules (TS; SQL is source of truth)
│   └── …                  # auth, banks, legal, llm, ratelimit, …
├── messages/              # en.json · hi.json
├── supabase/
│   └── migrations/        # Schema, policies, transition_case, storage
├── tests/
│   ├── unit/
│   ├── contract/
│   └── e2e/
├── docs/                  # Safety contract, deploy notes
├── config/                # Env key catalogue
├── scripts/               # verify-no-auto-send, evals
├── proxy.ts               # Locale + healthz routing
├── vercel.json
└── package.json
```

Root config only: `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.mjs`, `.env.example`, `LICENSE`, `SECURITY.md`, `CONTRIBUTING.md`.

---

## Run locally

**Node ≥ 22.14 · pnpm 10.12.1**

```bash
git clone https://github.com/thribhuvan003/unhold.git
cd unhold
pnpm install --frozen-lockfile
cp .env.example .env.local    # never commit secrets
# apply supabase/migrations/ to your Supabase project
pnpm dev
```

```bash
pnpm verify           # lint · types · unit · contracts · no-auto-send · build
pnpm test:e2e:smoke   # Playwright
```

Env keys: [`config/VERCEL_ENV_KEYS.md`](config/VERCEL_ENV_KEYS.md).

---

## Security (short)

- No service-role key in the browser
- Server checks case access before data operations
- Private evidence buckets; size and type limits
- Optional document AI only with consent; non-AI path still works
- Report issues privately: [`SECURITY.md`](SECURITY.md)

---

## Status

Public beta **0.1.0**. Extraction can be wrong. Guidance can go stale. Only the bank and ordering authority decide if an account moves.

---

## Author

[thribhuvan003](https://github.com/thribhuvan003) · [CONTRIBUTING.md](CONTRIBUTING.md)

MIT License
