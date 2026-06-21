# LienLiberator — File Manifest

**Generated:** 2026-06-20  
**Repo:** `lienliberator/`  
**Active slice:** `slice-01` (`MANIFEST.json` → `harness_state: routing`)  
**Sources:** `config/harness/slice-orchestration.json`, `docs/BUILD_SPEC_LOOPS.md` §12, `docs/HARNESS.md`, on-disk glob

---

## Legend

| Status | Meaning |
|--------|---------|
| **exists** | File on disk with substantive implementation (not a placeholder) |
| **stub** | File on disk but intentionally incomplete — returns `not_implemented`, hand-written types ahead of migrations, or LLM wiring deferred |
| **slice-NN** | Not on disk; in `scope_files` for harness slice NN (build via IMPLEMENTER) |
| **todo** | Not on disk; harness/infra artifact with no product-slice owner, or session artifact not yet written |

**Slice column:** Primary harness slice that owns the file per `slice-orchestration.json`. `—` = cross-cutting / pre-slice infrastructure. `+N` = also touched in later slice.

---

## Section A0 — Team Lead & Multi-Agent (read before building)

Claude acts as **Team Lead**; specialists research/review in parallel; harness agents build sequentially.

| Path | Status | Notes |
|------|--------|-------|
| `docs/START_HERE.md` | exists | **Entry point** — Team Lead every session |
| `docs/TEAM_ORCHESTRATION.md` | exists | Dispatch protocol, org chart |
| `docs/RESEARCH_PROTOCOL.md` | exists | Cite-or-stop; no invention |
| `docs/ANTI_HALLUCINATION.md` | exists | 25 traps expanded |
| `docs/PRE_FLIGHT_CHECKLIST.md` | exists | Bootstrap gate before slice-01 code |
| `config/harness/team-roster.json` | exists | Slice → specialist matrix |
| `prompts/team/TEAM_LEAD.md` | exists | Orchestrator role |
| `prompts/team/RESEARCHER.md` | exists | Spec archaeologist |
| `prompts/team/ARCHITECT.md` | exists | Boundaries & loops |
| `prompts/team/DB_ENGINEER.md` | exists | Migrations, RLS, seeds |
| `prompts/team/BACKEND_ENGINEER.md` | exists | API, state machine, jobs |
| `prompts/team/FRONTEND_ENGINEER.md` | exists | UI, a11y, NextStepsCard |
| `prompts/team/AGENTS_ENGINEER.md` | exists | Product LLM agents |
| `prompts/team/SECURITY_AUDITOR.md` | exists | Mandatory every slice review |
| `prompts/team/QA_ENGINEER.md` | exists | Test ↔ acceptance matrix |
| `prompts/team/DEVOPS_ENGINEER.md` | exists | Cron, env, deploy |
| `prompts/team/README.md` | exists | Team index |
| `prompts/templates/research-brief-template.md` | exists | RESEARCHER output |
| `prompts/templates/plan-template.md` | exists | PLANNER skeleton |
| `prompts/templates/handoff-template.md` | exists | Session end |
| `prompts/templates/adr-template.md` | exists | Architecture decisions |
| `prompts/templates/subagent-dispatch-template.md` | exists | Sub-agent envelope |

---

## Section A — Harness & Claude Files

Build-time agent loop: `ROUTER → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER`.  
Product runtime agents live in Section B; do not mix prompts.  
Team specialists (Section A0) feed PLANNER and REVIEWER.

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `CLAUDE.md` | exists | — | App entry; points to workspace `CLAUDE.md` + harness docs |
| `MANIFEST.json` | exists | — | Slice progress, `harness_state`, verification cache |
| `.claude/settings.json` | exists | — | Harness loop limits (review/verify rounds) |
| `.claude/session/slice-01/route.json` | exists | slice-01 | ROUTER output; `next_agent: PLANNER` |
| `.claude/session/slice-01/plan.md` | todo | slice-01 | PLANNER output |
| `.claude/session/slice-01/review-round-{n}.json` | todo | slice-01 | REVIEWER output |
| `.claude/session/slice-01/verification.json` | todo | slice-01 | VERIFIER output |
| `.claude/session/slice-01/summary.md` | todo | slice-01 | Post-slice narrative |
| `.claude/session/slice-01/handoff.md` | todo | slice-01 | Session resume state |
| `.claude/session/slice-02/` … `slice-11/` | todo | — | Created by `run-slice.sh --init-session` per slice |
| `prompts/agents/ROUTER.md` | exists | — | Build-time; no code edits |
| `prompts/agents/PLANNER.md` | exists | — | Build-time; writes `plan.md` only |
| `prompts/agents/IMPLEMENTER.md` | exists | — | Build-time; edits `scope_files` only |
| `prompts/agents/REVIEWER.md` | exists | — | Build-time; emits review JSON |
| `prompts/agents/VERIFIER.md` | exists | — | Build-time; runs shell gates (not product VERIFIER) |
| `prompts/README.md` | exists | — | Harness vs product prompt index |
| `prompts/product/INTAKE.md` | exists | slice-05 | Runtime LLM system prompt |
| `prompts/product/DRAFTER.md` | exists | slice-07 | Runtime LLM system prompt |
| `prompts/product/MONITOR.md` | exists | slice-09 | Runtime LLM system prompt |
| `prompts/product/VERIFIER.md` | exists | slice-05+ | Runtime evidence OCR/extract prompt |
| `prompts/product/ESCALATOR.md` | exists | slice-08+ | Runtime escalation suggestion prompt |
| `prompts/product/ORCHESTRATOR.md` | exists | slice-09 | Runtime tick orchestration notes |
| `config/harness/slice-orchestration.json` | exists | — | 11 slices, agent pipeline, `scope_files` |
| `config/harness/slice-orchestration.schema.json` | todo | — | Referenced by `$schema`; not yet committed |
| `scripts/harness/run-slice.sh` | exists | — | `--status`, `--verify-only`, `--complete-slice`, `--verify-phase-exit` |
| `scripts/harness/review-checklist.md` | exists | — | REVIEWER checklist |
| `lib/loops/agent-harness.ts` | exists | — | Harness state machine types + transition helpers |
| `lib/loops/dev-loop.ts` | exists | — | DEV LOOP runner (`runDevLoop`, `SLICE_09_CRON_TICK`) |

---

## Section B — Product Loop Runtime

From `docs/BUILD_SPEC_LOOPS.md` §12 — INNER loop, AGENT loop, job queue, swarm events.  
Implemented early (pre–slice-09) as shared infrastructure; API route handlers are still slice-owned.

### `lib/loops/`

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `lib/loops/case-tick.ts` | exists | slice-09 | `runCaseTick`, `runBatchCaseTicks` — INNER + batch OUTER driver |
| `lib/loops/scheduling.ts` | exists | slice-09 | `computeNextCheckAt()` per §2.3 |
| `lib/loops/locks.ts` | exists | slice-09 | Redis `case_tick:{id}` + cron bucket locks |
| `lib/loops/termination.ts` | exists | slice-09 | `shouldTerminateLoop`, `TERMINAL_STATUSES` |
| `lib/loops/tick-types.ts` | exists | slice-09 | `TickTrigger`, `CaseTickResult` |
| `lib/loops/types.ts` | exists | slice-09 | Re-exports loop + harness types |
| `lib/loops/agent-harness.ts` | exists | — | *(also Section A)* |
| `lib/loops/dev-loop.ts` | exists | — | *(also Section A)* |

### `lib/agents/` (router, runner, schemas)

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `lib/agents/router.ts` | exists | slice-09 | LEAD ROUTER + `routeModel()` — non-LLM spawn plan |
| `lib/agents/runner.ts` | stub | slice-05+ | `runAgentJob` — schema validation only; Anthropic SDK wired in 05–09 |
| `lib/agents/schemas.ts` | exists | slice-05 | Zod outputs (INTAKE, DRAFTER, MONITOR, VERIFIER, ESCALATOR) |
| `lib/agents/validators.ts` | exists | slice-05 | Citation grounding, confidence thresholds |
| `lib/agents/tools/registry.ts` | exists | slice-05 | `FORBIDDEN_TOOL_NAMES`, per-role allowlist |
| `lib/agents/tools/handlers.ts` | stub | slice-05+ | `invokeAgentTool` → `tool_not_implemented` until slice 05 |

### `lib/jobs/`

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `lib/jobs/enqueue.ts` | exists | slice-05 | Idempotent `agent_jobs` upsert on `idempotency_key` |
| `lib/jobs/process.ts` | exists | slice-05 | `processAgentJobs` — drain pending queue |
| `lib/jobs/idempotency.ts` | exists | slice-05 | Redis API idempotency (24h TTL) |

### `lib/swarm/`

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `lib/swarm/append-event.ts` | exists | slice-09 | `appendSwarmEvent` wrapper |

### Internal API routes (loop entrypoints)

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `app/api/v1/internal/cron/tick/route.ts` | slice-09 | slice-09 | `runBatchCaseTicks()` — */15 cron |
| `app/api/v1/internal/cron/reminders/route.ts` | slice-09 | slice-09 | Day-bucket reminders, quiet hours |
| `app/api/v1/internal/cron/rankings/route.ts` | slice-09 | — | In `BUILD_SPEC_LOOPS` §12 + `vercel.json`; no slice scope entry |
| `app/api/v1/internal/jobs/process/route.ts` | slice-05 | slice-05 | `processAgentJobs()` — */5 cron |
| `app/api/v1/internal/jobs/enqueue/route.ts` | slice-05 | slice-05 | Manual ops/debug enqueue |

---

## Section C — Per-Slice Application Files

All paths from `config/harness/slice-orchestration.json` → `slices[].scope_files`.  
Files already listed in Section B show **+slice** when a later slice extends them.

### Slice 01 — Migrations + RLS + SBI seed

| Path | Status | Notes |
|------|--------|-------|
| `supabase/migrations/001_extensions_enums.sql` | exists | Extensions + canonical enums (13 `case_status` values) |
| `supabase/migrations/002_reference_tables.sql` | slice-01 | Banks, playbooks, templates |
| `supabase/migrations/003_identity_tables.sql` | slice-01 | Users, guest sessions |
| `supabase/migrations/004_cases.sql` | slice-01 | `cases` + loop control columns |
| `supabase/migrations/005_evidence_action_logs.sql` | slice-01 | Evidence, `action_logs` |
| `supabase/migrations/006_escalations_swarm.sql` | slice-01 | Escalations, `swarm_events`, `human_gate_queue` |
| `supabase/migrations/007_jobs_consent_fees.sql` | slice-01 | `agent_jobs`, `consent_records`, fees |
| `supabase/migrations/008_rankings_audit.sql` | slice-01 | Rankings, audit |
| `supabase/migrations/009_functions_triggers.sql` | slice-01 | `transition_case()`, append-only triggers |
| `supabase/migrations/010_rls_views_seed.sql` | slice-01 | RLS policies, SBI seed, playbook seed |
| `supabase/database.types.ts` | stub | Hand-written shape ahead of full migration apply; regen after slice-01 |

### Slice 02 — Guest session + case CRUD

| Path | Status | Notes |
|------|--------|-------|
| `lib/supabase/client.ts` | exists | Browser Supabase client |
| `lib/supabase/server.ts` | exists | Server Supabase client (cookies) |
| `lib/supabase/admin.ts` | exists | Service-role client |
| `lib/auth/guest.ts` | slice-02 | Device token JWT, `ll_guest` cookie |
| `lib/validation/api-schemas.ts` | slice-02 | Zod request/response envelopes |
| `lib/ratelimit.ts` | slice-02 | Guest 5/day limit |
| `middleware.ts` | slice-02 | Auth + guest token routing |
| `app/api/v1/guest/sessions/route.ts` | slice-02 | `POST` guest session |
| `app/api/v1/cases/route.ts` | slice-02 | `POST`/`GET` cases |
| `app/api/v1/cases/[public_id]/route.ts` | slice-02 | Public ID lookup |
| `app/api/v1/cases/[id]/claim/route.ts` | slice-02 | Auth merge |
| `app/api/v1/cases/[id]/intake/route.ts` | slice-02 | Intake JSON patch |
| `app/guest/report/page.tsx` | slice-02 | Guest intake UI |
| `app/cases/page.tsx` | slice-02 | Case list |
| `app/cases/new/page.tsx` | slice-02 | New case |
| `app/cases/[id]/page.tsx` | slice-02 | Case detail shell (+slice-06 widgets) |
| `tests/contract/guest-sessions.test.ts` | slice-02 | |
| `tests/contract/cases-crud.test.ts` | slice-02 | |

### Slice 03 — Evidence upload + SHA-256

| Path | Status | Notes |
|------|--------|-------|
| `app/api/v1/cases/[id]/evidence/upload-url/route.ts` | slice-03 | Presigned upload URL |
| `app/api/v1/cases/[id]/evidence/[eid]/confirm/route.ts` | slice-03 | SHA-256 + status; triggers `new→intake_scoping` |
| `lib/evidence/sha256.ts` | slice-03 | Hash helper |
| `lib/evidence/storage-path.ts` | slice-03 | `{case_id}/{evidence_id}/{filename}` |
| `components/evidence/EvidenceUploader.tsx` | slice-03 | Client upload widget |
| `tests/unit/evidence/sha256.test.ts` | slice-03 | |
| `tests/contract/evidence-upload.test.ts` | slice-03 | |

### Slice 04 — State machine API + action_logs

| Path | Status | Notes |
|------|--------|-------|
| `lib/state-machine/types.ts` | slice-04 | Status/event types |
| `lib/state-machine/guards.ts` | slice-04 | 50+ guard functions |
| `lib/state-machine/transitions.ts` | slice-04 | Guarded transition map |
| `app/api/v1/cases/[id]/transitions/route.ts` | slice-04 | **Only** way to change `case.status` |
| `lib/action-logs/append.ts` | slice-04 | Append-only audit |
| `tests/unit/state-machine/guards.test.ts` | slice-04 | ≥50 tests |
| `tests/contract/transitions.test.ts` | slice-04 | |

### Slice 05 — Intake classifier (rules + LLM)

| Path | Status | Notes |
|------|--------|-------|
| `lib/agents/schemas.ts` | exists | *(Section B)* |
| `lib/agents/validators.ts` | exists | *(Section B)* |
| `lib/agents/prompts/global.ts` | slice-05 | Shared agent preamble |
| `lib/agents/prompts/intake.ts` | slice-05 | Intake prompt builder |
| `lib/agents/intake/runner.ts` | slice-05 | Rule engine + LLM path |
| `lib/agents/intake/rules.ts` | slice-05 | `evidence_count=0` fast path |
| `lib/agents/tools/registry.ts` | exists | *(Section B)* |
| `lib/jobs/enqueue.ts` | exists | *(Section B)* |
| `lib/jobs/process.ts` | exists | *(Section B)* |
| `lib/jobs/idempotency.ts` | exists | *(Section B)* |
| `app/api/v1/internal/jobs/enqueue/route.ts` | slice-05 | *(Section B)* |
| `app/api/v1/internal/jobs/process/route.ts` | slice-05 | *(Section B)* |
| `tests/unit/agents/intake.test.ts` | slice-05 | |
| `tests/golden/agent_eval.json` | slice-05 | Golden eval fixtures |

### Slice 06 — NextStepsCard + user_actions

| Path | Status | Notes |
|------|--------|-------|
| `components/case/NextStepsCard.tsx` | slice-06 | Primary case-detail widget |
| `components/case/ActionInbox.tsx` | slice-06 | User action inbox |
| `components/case/SwarmLogPanel.tsx` | slice-06 | Behind Details tab |
| `lib/user-actions/create.ts` | slice-06 | Create from intake checklist |
| `app/api/v1/cases/[id]/user-actions/route.ts` | slice-06 | CRUD + Realtime |
| `app/cases/[id]/page.tsx` | slice-02 | Extended in slice-06 |
| `tests/unit/components/NextStepsCard.test.tsx` | slice-06 | |

### Slice 07 — Drafter L1–L3 copy-only

| Path | Status | Notes |
|------|--------|-------|
| `lib/agents/prompts/drafter.ts` | slice-07 | |
| `lib/agents/drafter/runner.ts` | slice-07 | Copy-only; no auto-send |
| `lib/agents/fallback/sbi_l1.ts` | slice-07 | Template fallback |
| `lib/agents/fallback/sbi_l2.ts` | slice-07 | |
| `lib/agents/fallback/sbi_l3.ts` | slice-07 | |
| `app/api/v1/cases/[id]/escalations/route.ts` | slice-07 | List/create escalations |
| `app/cases/[id]/letters/[level]/page.tsx` | slice-07 | Letter preview UI |
| `components/letters/LetterPreview.tsx` | slice-07 | |
| `lib/constants/disclaimers.ts` | slice-07 | Blocks A–H (+slice-10) |
| `tests/unit/agents/drafter.test.ts` | slice-07 | |

### Slice 08 — Escalation proof gates

| Path | Status | Notes |
|------|--------|-------|
| `lib/escalations/proof-gates.ts` | slice-08 | L2/L3/L4 proof requirements |
| `lib/escalations/ladder.ts` | slice-08 | Level progression rules |
| `app/api/v1/cases/[id]/escalations/[eid]/approve/route.ts` | slice-08 | User approves draft |
| `app/api/v1/cases/[id]/escalations/[eid]/mark-sent/route.ts` | slice-08 | Proof-gated mark-sent |
| `components/escalations/MarkSentForm.tsx` | slice-08 | Proof upload UI |
| `tests/unit/escalations/proof-gates.test.ts` | slice-08 | |
| `tests/e2e/mark-sent.spec.ts` | slice-08 | `@smoke` |

### Slice 09 — Cron tick + reminders

| Path | Status | Notes |
|------|--------|-------|
| `lib/agents/prompts/monitor.ts` | slice-09 | |
| `lib/agents/monitor/runner.ts` | slice-09 | Never auto-sends |
| `lib/agents/router.ts` | exists | *(Section B)* |
| `app/api/v1/internal/cron/tick/route.ts` | slice-09 | *(Section B)* |
| `app/api/v1/internal/cron/reminders/route.ts` | slice-09 | *(Section B)* |
| `vercel.json` | exists | Cron schedules configured; route handlers pending |
| `tests/unit/agents/monitor.test.ts` | slice-09 | |

### Slice 10 — Disclaimers + consent

| Path | Status | Notes |
|------|--------|-------|
| `lib/constants/disclaimers.ts` | slice-07 | Verbatim Blocks A–H finalized in slice-10 |
| `lib/consent/record.ts` | slice-10 | Append-only `consent_records` |
| `components/legal/DisclaimerModal.tsx` | slice-10 | Block B intake modal |
| `components/legal/ConsentCheckbox.tsx` | slice-10 | |
| `app/legal/disclaimer/page.tsx` | slice-10 | |
| `app/legal/privacy/page.tsx` | slice-10 | |
| `app/layout.tsx` | slice-10 | Global legal links |
| `tests/unit/consent/record.test.ts` | slice-10 | |

### Slice 11 — Human ops queue

| Path | Status | Notes |
|------|--------|-------|
| `app/api/v1/ops/queue/route.ts` | slice-11 | Operator JWT required |
| `app/ops/queue/page.tsx` | slice-11 | Ops dashboard |
| `lib/ops/human-gate.ts` | slice-11 | Gate resolve helpers |
| `lib/ops/operator-auth.ts` | slice-11 | Operator JWT validation |
| `components/ops/QueueTable.tsx` | slice-11 | |
| `tests/contract/ops-queue.test.ts` | slice-11 | |
| `tests/e2e/guest-intake.spec.ts` | slice-11 | Phase 1 E2E `@smoke` |

---

## Section D — Tests Tree

Planned layout from orchestration `scope_files`, `package.json` scripts, and `BUILD_SPEC_LOOPS.md` §12–§13.

```
tests/
├── contract/
│   ├── guest-sessions.test.ts          slice-02
│   ├── cases-crud.test.ts              slice-02
│   ├── evidence-upload.test.ts         slice-03
│   ├── transitions.test.ts             slice-04
│   └── ops-queue.test.ts               slice-11
├── unit/
│   ├── loops/
│   │   ├── case-tick.test.ts           slice-09  (BUILD_SPEC_LOOPS §12)
│   │   ├── scheduling.test.ts          slice-09
│   │   └── termination.test.ts         slice-09
│   ├── agents/
│   │   ├── router.test.ts              slice-09
│   │   ├── runner.test.ts              slice-05+
│   │   ├── intake.test.ts              slice-05
│   │   ├── drafter.test.ts             slice-07
│   │   ├── monitor.test.ts             slice-09
│   │   └── golden/                     slice-05  (pnpm test:agents:golden)
│   ├── jobs/
│   │   └── enqueue.test.ts             slice-05
│   ├── state-machine/
│   │   └── guards.test.ts              slice-04  (≥50 tests)
│   ├── evidence/
│   │   └── sha256.test.ts              slice-03
│   ├── escalations/
│   │   └── proof-gates.test.ts         slice-08
│   ├── components/
│   │   └── NextStepsCard.test.tsx      slice-06
│   └── consent/
│       └── record.test.ts              slice-10
├── integration/
│   ├── loop-idempotency.test.ts        slice-09  (double-tick safe)
│   └── rls/                            slice-01  (pnpm test:rls)
├── golden/
│   └── agent_eval.json                 slice-05
└── e2e/
    ├── mark-sent.spec.ts               slice-08  @smoke
    └── guest-intake.spec.ts            slice-11  @smoke (phase exit)
```

| Path | Status | Slice |
|------|--------|-------|
| `tests/contract/guest-sessions.test.ts` | slice-02 | slice-02 |
| `tests/contract/cases-crud.test.ts` | slice-02 | slice-02 |
| `tests/contract/evidence-upload.test.ts` | slice-03 | slice-03 |
| `tests/contract/transitions.test.ts` | slice-04 | slice-04 |
| `tests/contract/ops-queue.test.ts` | slice-11 | slice-11 |
| `tests/unit/loops/case-tick.test.ts` | slice-09 | slice-09 |
| `tests/unit/loops/scheduling.test.ts` | slice-09 | slice-09 |
| `tests/unit/loops/termination.test.ts` | slice-09 | slice-09 |
| `tests/unit/agents/router.test.ts` | slice-09 | slice-09 |
| `tests/unit/agents/runner.test.ts` | slice-05 | slice-05+ |
| `tests/unit/agents/intake.test.ts` | slice-05 | slice-05 |
| `tests/unit/agents/drafter.test.ts` | slice-07 | slice-07 |
| `tests/unit/agents/monitor.test.ts` | slice-09 | slice-09 |
| `tests/unit/agents/golden/` | slice-05 | slice-05 |
| `tests/unit/jobs/enqueue.test.ts` | slice-05 | slice-05 |
| `tests/unit/state-machine/guards.test.ts` | slice-04 | slice-04 |
| `tests/unit/evidence/sha256.test.ts` | slice-03 | slice-03 |
| `tests/unit/escalations/proof-gates.test.ts` | slice-08 | slice-08 |
| `tests/unit/components/NextStepsCard.test.tsx` | slice-06 | slice-06 |
| `tests/unit/consent/record.test.ts` | slice-10 | slice-10 |
| `tests/integration/loop-idempotency.test.ts` | slice-09 | slice-09 |
| `tests/integration/rls/` | slice-01 | slice-01 |
| `tests/golden/agent_eval.json` | slice-05 | slice-05 |
| `tests/e2e/mark-sent.spec.ts` | slice-08 | slice-08 |
| `tests/e2e/guest-intake.spec.ts` | slice-11 | slice-11 |

**On disk today:** `tests/` directory does not exist (0 test files).

---

## Section E — Config & Infrastructure

| Path | Status | Slice | Notes |
|------|--------|-------|-------|
| `package.json` | exists | — | Scripts: `typecheck`, `test:unit`, `test:contract`, `verify:no-auto-send`, etc. |
| `pnpm-lock.yaml` | todo | — | Generated on first `pnpm install` |
| `vercel.json` | exists | slice-09 | Crons + function limits; routes not yet implemented |
| `tsconfig.json` | exists | — | `@/*` path alias |
| `next-env.d.ts` | exists | — | Next.js types |
| `.env.example` | exists | — | Env var template |
| `.gitignore` | exists | — | Ignores `.claude/session/` |
| `scripts/verify-no-auto-send.sh` | exists | — | CI grep gate (forbidden send patterns) |
| `supabase/migrations/001_extensions_enums.sql` | exists | slice-01 | See Section C |
| `supabase/migrations/002_reference_tables.sql` | slice-01 | slice-01 | |
| `supabase/migrations/003_identity_tables.sql` | slice-01 | slice-01 | |
| `supabase/migrations/004_cases.sql` | slice-01 | slice-01 | |
| `supabase/migrations/005_evidence_action_logs.sql` | slice-01 | slice-01 | |
| `supabase/migrations/006_escalations_swarm.sql` | slice-01 | slice-01 | |
| `supabase/migrations/007_jobs_consent_fees.sql` | slice-01 | slice-01 | |
| `supabase/migrations/008_rankings_audit.sql` | slice-01 | slice-01 | |
| `supabase/migrations/009_functions_triggers.sql` | slice-01 | slice-01 | |
| `supabase/migrations/010_rls_views_seed.sql` | slice-01 | slice-01 | |
| `supabase/database.types.ts` | stub | slice-01 | Regenerate after migrations apply |
| `middleware.ts` | slice-02 | slice-02 | |
| `app/layout.tsx` | slice-10 | slice-10 | |
| `.github/workflows/harness-verify.yml` | todo | — | Stub in `HARNESS.md` §12 |

### Documentation (reference, not slice-owned)

| Path | Status | Notes |
|------|--------|-------|
| `docs/HARNESS.md` | exists | Harness loop spec |
| `docs/BUILD_SPEC.md` | exists | Product BUILD_SPEC v3 |
| `docs/BUILD_SPEC_AGENTS.md` | exists | Agent schemas, tools, prompts |
| `docs/BUILD_SPEC_LOOPS.md` | exists | Loop engineering spec |
| `docs/LOOP_ENGINEERING.md` | exists | Product vs dev loop mirror |
| `docs/FILE_MANIFEST.md` | exists | This file |

---

## Summary

| Metric | Count |
|--------|------:|
| **Total tracked paths** | **164** |
| **exists** | **52** |
| **stub** | **3** |
| **slice-NN** (not on disk, slice-owned) | **97** |
| **todo** (not on disk, harness/infra) | **12** |

### Breakdown by section

| Section | exists | stub | slice-NN | todo |
|---------|-------:|-----:|---------:|-----:|
| A — Harness & Claude | 20 | 0 | 0 | 8 |
| B — Product loop runtime | 14 | 2 | 5 | 0 |
| C — Per-slice application | 4 | 1 | 78 | 0 |
| D — Tests | 0 | 0 | 24 | 0 |
| E — Config & infra | 8 | 0 | 9 | 4 |
| Docs (reference) | 6 | 0 | 0 | 0 |

*Note: Section totals overlap by design (e.g. `lib/agents/router.ts` counted in B and referenced in C). **Total tracked paths** = exists + stub + slice-NN + todo. Cross-references in Section C use "*(Section B)*".*

### On-disk inventory (2026-06-20)

**55** files under `lienliberator/` (52 **exists** + 3 **stub**): docs, harness, loop runtime, migration `001`, Supabase clients. No `app/` routes, `components/`, or `tests/` trees yet.

**Stubs on disk:** `lib/agents/runner.ts`, `lib/agents/tools/handlers.ts`, `supabase/database.types.ts`

---

## Reading Order — New Claude Session

Read in this order before writing code:

1. **`MANIFEST.json`** — `active_slice`, `harness_state`, which agent to load next  
2. **`bash scripts/harness/run-slice.sh --status`** — live slice + gate state  
3. **`docs/HARNESS.md`** — harness agent roles, fix loops, exit criteria  
4. **`config/harness/slice-orchestration.json`** — current slice `scope_files`, `forbidden_in_slice`, `verification.commands`  
5. **`.claude/session/{active_slice}/handoff.md`** (if present) or **`route.json`** — resume point  
6. **Agent prompt** — `prompts/agents/{ROUTER|PLANNER|IMPLEMENTER|REVIEWER|VERIFIER}.md` per `harness_state`  
7. **`docs/BUILD_SPEC.md`** — sections cited in slice `spec_refs`  
8. **`docs/BUILD_SPEC_AGENTS.md`** — when slice touches `lib/agents/` (slices 05–09)  
9. **`docs/BUILD_SPEC_LOOPS.md`** — when slice touches crons, ticks, or job queue (slices 05, 09)  
10. **`docs/FILE_MANIFEST.md`** (this file) — what exists vs what the active slice may create  
11. **Slice plan** — `.claude/session/{active_slice}/plan.md` after PLANNER runs  

**IMPLEMENTER guardrails:** edit only files in active slice `scope_files`; never `forbidden_in_slice`; run `pnpm verify:no-auto-send` before handoff.

**Phase 1 exit (after slice-11):** `bash scripts/harness/run-slice.sh --verify-phase-exit` + `pnpm test:e2e:smoke`