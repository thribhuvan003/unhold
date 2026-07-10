# Unhold — working notes for Claude

Unhold is a Next.js + Supabase app that helps people unfreeze a bank/UPI account
after a cyber-cell or court order: it explains the freeze, verifies documents,
drafts authority-ready letters, and tracks deadlines. A deterministic state
machine — not the LLM — decides what advances a case.

## Stack

Next.js 16 (App Router) · TypeScript strict · Supabase (Postgres + RLS + Auth) ·
Groq + NVIDIA NIM routing · Zod · Vitest · Playwright · pnpm · Vercel (`bom1`).

## Commands

```bash
pnpm dev            # local dev
pnpm typecheck      # tsc --noEmit
pnpm test:unit      # unit + golden agent fixtures
pnpm test:contract  # API contract tests
pnpm build          # next build
```

## Invariants — do not break these

- **No auto-send.** Letters are never sent without explicit human approval; a
  guard test enforces this (`pnpm verify:no-auto-send`).
- **Proof gates.** An escalation cannot be approved or marked sent without the
  required evidence on file (`lib/escalations/proof-gates.ts`).
- **Append-only audit log.** `action_logs` is immutable at the DB level; never
  add code that expects to `UPDATE`/`DELETE` it.
- **Consent-gated OCR.** No document is AI-processed without a per-case consent
  record (`lib/consent/`).
- **Redaction before storage.** Every stored LLM output is PII-redacted first.
- **Honest legal currency.** Positions in `lib/legal/positions.ts` carry a
  source and a `current`/`contested` tag; never present a contested ruling as
  settled law.

## Memory

Persistent memory via Supermemory — recall relevant memory at the start of a
task and save durable decisions/gotchas as you go. Container tag: `lienliberator`
(this is the internal codename baked into the memory namespace; keep it stable).

## Build harness (optional)

The multi-agent build harness (prompts, orchestration config, and process docs)
lives under [`.harness/`](.harness/) and is not part of the product runtime. It
is only relevant when running the internal build loop; product work does not
need it.
