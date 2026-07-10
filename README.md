<div align="center">

# Unhold

**An AI case manager for bank & UPI account freezes.**

Account frozen out of nowhere? Unhold turns a confusing legal notice into a
guided, step-by-step resolution â€” with a verified multi-agent pipeline doing
the document work.

[![Live](https://img.shields.io/badge/live-unholdd.vercel.app-22c55e?style=flat-square&logo=vercel)](https://www.unhold.live)
[![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tests](https://img.shields.io/badge/tests-341_cases-16a34a?style=flat-square&logo=vitest&logoColor=white)](#testing)
[![NVIDIA NIM](https://img.shields.io/badge/NVIDIA_NIM-MiniMax--M3-76b900?style=flat-square&logo=nvidia)](https://build.nvidia.com)

### [â–¶ See a worked example â€” no signup](https://www.unhold.live/demo)

Walk a real frozen-account case end to end with sample data, no account or
documents required.

| Guided start | The worked example | Full Hindi (à¤¹à¤¿à¤‚à¤¦à¥€) |
| :---: | :---: | :---: |
| <img src="docs/screenshots/home-en.png" alt="Unhold home â€” Bank account frozen? Let's fix it, one step at a time" width="260"> | <img src="docs/screenshots/demo-en.png" alt="Worked example â€” your bank can't lift a cyber freeze, only the cyber cell that ordered it can" width="260"> | <img src="docs/screenshots/home-hi.png" alt="Unhold in Hindi â€” the full product, end to end" width="260"> |

</div>

---

## Why this beats asking ChatGPT

- **Dated, sourced law â€” and it flags what's contested.** Every legal position carries a source and a `current`/`contested` tag ([`lib/legal/positions.ts`](lib/legal/positions.ts)); a general model states pre-cutoff law as settled and can't tell you the blanket-freeze rulings are under Supreme Court appeal.
- **It routes you to who can actually unfreeze you.** Your bank branch cannot lift a cyber-cell freeze â€” the cyber cell's NOC can. Unhold names the real track and key step per freeze type ([`lib/case/unfreeze-path.ts`](lib/case/unfreeze-path.ts)); a chatbot hands you a generic letter to the wrong desk.
- **An LLM can never introduce an unvetted legal citation.** Model drafts pass a statute allowlist â€” any citation beyond the vetted BNSS 106/107, any repealed IPC/CrPC reference, or any police-freeze citation on a court/tax/KYC track is rejected and the letter falls back to deterministic, human-vetted templates ([`lib/agents/validators.ts`](lib/agents/validators.ts)). Kill the API key and the product still works.
- **Stateful, proof-gated escalation.** A case advances through a deterministic state machine, and an escalation can't be approved or sent without the required evidence on file ([`lib/escalations/proof-gates.ts`](lib/escalations/proof-gates.ts)).
- **It remembers your case.** Facts, documents, and deadlines persist and drive daily follow-ups â€” not a one-shot answer you have to re-explain every time.

---

## The problem

In India, bank accounts and UPI IDs get frozen by cyber-cell orders with little
explanation. Victims face weeks of guesswork: which authority froze the account,
what documents to gather, whom to write to, and how to follow up. Most people
either pay agents or give up.

Unhold automates that entire loop.

## What it does

- **Explains the freeze** â€” parses the notice and produces plain-language next steps
- **Verifies documents** â€” vision OCR with PII redaction and forgery flags; low-confidence results go to human review, never guessed
- **Drafts the paperwork** â€” authority-ready letters grounded in the case facts, with graded escalation levels
- **Bundles evidence** â€” assembles submission-ready proof packs for each authority
- **Keeps cases moving** â€” daily cron sweeps track deadlines and trigger reminders

## Architecture

### Five-agent pipeline

Each agent owns one stage of a case. Four run as idempotent jobs on a queue;
the Monitor runs on a daily Vercel cron. A deterministic state machine â€” not
the LLM â€” decides what happens next.

```mermaid
flowchart LR
    N[Notice uploaded] --> I[Intake Agent<br/>classify freeze Â· extract facts]
    I --> V[Verifier Agent<br/>vision OCR Â· PII redaction Â· forgery flags]
    V --> D[Drafter Agent<br/>authority-ready letters]
    D --> E[Evidence Agent<br/>submission-ready proof bundles]
    M[Monitor Agent<br/>daily cron Â· deadlines Â· reminders] -.->|new development| I
```

Every agent job carries an idempotency key, and every output is validated
against a Zod schema before it can advance a case. When a provider fails, the
system degrades to deterministic templates instead of erroring.

### LLM routing

| Task | Primary | Fallback |
|---|---|---|
| Text â€” classification, drafting | Groq Â· Llama 3.3 70B | NVIDIA NIM Â· Llama 3.3 70B |
| Vision â€” document OCR | NVIDIA NIM Â· MiniMax-M3 (multimodal) | Deterministic templates |

Each provider rotates across a key pool with automatic 429 failover. The chat
layer never throws â€” callers always land on a safe fallback path.

### Trust & safety by design

- **Recorded consent** â€” the vision-OCR path is hard-gated on a per-case consent record; no document is AI-processed without it
- **Append-only audit log** â€” `action_logs` is immutable at the database level (a trigger rejects `UPDATE` and `DELETE`), with 8-year retention
- **Proof gates** â€” an escalation cannot be approved or marked sent without the required evidence on file
- **PII redaction** â€” extracted fields, mismatches, and forgery flags are redacted before storage
- **Human-in-the-loop** â€” low-confidence OCR or classification is flagged `human_review_required` instead of silently accepted

## Testing

**341 automated test cases** across five suites:

| Suite | Command | What it proves |
|---|---|---|
| Unit + golden agent fixtures | `pnpm test:unit` | Agent logic against golden transcripts |
| Contract | `pnpm test:contract` | API request/response contracts |
| RLS integration | `pnpm test:rls` | Postgres Row-Level Security isolation |
| Integration | `pnpm test:integration` | Cross-module flows |
| E2E (Playwright) | `pnpm test:e2e` | Real user journeys, `@smoke` tagged |

## Repository structure

```
unhold/
â”œâ”€â”€ app/                       Next.js App Router â€” product UI + versioned API
â”‚   â””â”€â”€ api/v1/                REST endpoints, cron routes, job-queue processor
â”œâ”€â”€ lib/
â”‚   â”œâ”€â”€ agents/                Intake Â· Verifier Â· Drafter Â· Evidence Â· Monitor,
â”‚   â”‚                          plus router, schemas, and validators
â”‚   â”œâ”€â”€ state-machine/         Deterministic case-status transitions
â”‚   â”œâ”€â”€ escalations/           Proof gates â€” evidence required before escalation
â”‚   â”œâ”€â”€ redaction/             PII redaction for every stored LLM output
â”‚   â”œâ”€â”€ consent/               Recorded per-purpose consent (gates AI OCR)
â”‚   â”œâ”€â”€ llm/                   Groq + NVIDIA NIM routing, key rotation, 429 failover
â”‚   â”œâ”€â”€ action-logs/           Append-only audit trail (DB-enforced immutability)
â”‚   â””â”€â”€ jobs/                  Idempotent agent job queue
â”œâ”€â”€ supabase/migrations/       Postgres schema, RLS policies, immutable audit tables
â”œâ”€â”€ tests/                     unit Â· contract Â· integration (RLS) Â· golden Â· e2e
â””â”€â”€ vercel.json                Crons, per-route limits, security headers (HSTS,
                               nosniff, X-Frame-Options)
```

## Tech stack

Next.js 16 Â· TypeScript (strict) Â· Supabase (Postgres + RLS + Auth) Â· Groq Â·
NVIDIA NIM (MiniMax-M3) Â· Zod Â· Vitest Â· Playwright Â· Vercel (Mumbai, `bom1`)

## Status

Live at [unholdd.vercel.app](https://www.unhold.live) â€” actively developed.

---

<div align="center">

Built by [Thribhuvan](https://github.com/thribhuvan003)

</div>
