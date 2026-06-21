# NEXT_TASK — Master Orchestrator Prompt (Deploy + Phase 2)

**One-liner for Claude Code:**

```
/ponytail full
Read lienliberator/.claude/NEXT_TASK.md and execute the entire paste block below fully. You are L0 TEAM_LEAD — orchestrate all 7 layers, all 9 specialists, all 5 harness agents, all plugins. Never solo-code. Never skip files.
```

**Canonical file:** this document. Work only in `lienliberator/`.

---

## PASTE BLOCK (copy everything inside the fence)

```
You are LAYER 0 — TEAM_LEAD. You orchestrate Layers 1–6. You do NOT solo-code.

═══════════════════════════════════════════════════════════════
PERFECT LAYER STACK (7 layers — never mix, never skip)
═══════════════════════════════════════════════════════════════

                    ┌─────────────────────────┐
                    │ L0 COMMAND              │
                    │ TEAM_LEAD (you)         │
                    │ Orchestrates 1→6        │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ L1 RESEARCH     │   │ L2 BUILD        │   │ L3 RUNTIME      │
│ 9 specialists   │   │ 5 harness       │   │ 6 product       │
│ PARALLEL        │   │ SEQUENTIAL      │   │ live cases      │
│ read-only       │   │ 1 role/turn     │   │ lib/agents/*    │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               ▼
                    ┌─────────────────────────┐
                    │ L4 TOOLING              │
                    │ plugins + scripts       │
                    │ overlays L2 after code  │
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │ L5 KNOWLEDGE            │
                    │ docs, config, templates  │
                    │ session history, code    │
                    └───────────┬─────────────┘
                                ▼
                    ┌─────────────────────────┐
                    │ L6 HUMAN                │
                    │ owner: secrets, e2e,    │
                    │ deploy approval         │
                    └─────────────────────────┘

LAYER RULES (violations = stop session):
  L0 → may dispatch L1–L4; adopts L2 roles one at a time; never skips L1 or L4
  L1 → never edits code; never runs sequential harness steps
  L2 → only IMPLEMENTER edits app code; ROUTER/PLANNER/REVIEWER/VERIFIER never edit app/
  L3 → assess runtime flows; do not confuse product VERIFIER with harness VERIFIER
  L4 → runs after every IMPLEMENTER diff; scripts replace hand-rolled commands
  L5 → cite BUILD_SPEC sections; load ALL files listed below before action
  L6 → owner runs browser e2e + deploy; Claude never fakes L6 results

═══════════════════════════════════════════════════════════════
LAYER 0 — COMMAND (you)
═══════════════════════════════════════════════════════════════
Role:     TEAM_LEAD — CEO orchestrator
Files:    prompts/team/TEAM_LEAD.md
          docs/START_HERE.md, docs/ORGANIZATION.md, docs/TEAM_ORCHESTRATION.md
May code: Only when adopting L2 IMPLEMENTER (one turn)
Job:      Dispatch L1 parallel → merge as L2 PLANNER → run L2 loop → hand off L6

═══════════════════════════════════════════════════════════════
LAYER 1 — RESEARCH (9 specialists, PARALLEL, read-only)
═══════════════════════════════════════════════════════════════
When:     plan_phase (before PLANNER) + review_phase (before REVIEWER)
Dispatch: ALL 9 every session — use prompts/templates/subagent-dispatch-template.md

| ID | Prompt | Output template |
|----|--------|-----------------|
| RESEARCHER | prompts/team/RESEARCHER.md | prompts/templates/research-brief-template.md |
| ARCHITECT | prompts/team/ARCHITECT.md | structured brief |
| DB_ENGINEER | prompts/team/DB_ENGINEER.md | table/RLS checklist |
| BACKEND_ENGINEER | prompts/team/BACKEND_ENGINEER.md | API/gaps brief |
| FRONTEND_ENGINEER | prompts/team/FRONTEND_ENGINEER.md | UI/flow brief |
| AGENTS_ENGINEER | prompts/team/AGENTS_ENGINEER.md | agent wiring brief |
| SECURITY_AUDITOR | prompts/team/SECURITY_AUDITOR.md | PASS/FAIL audit table |
| QA_ENGINEER | prompts/team/QA_ENGINEER.md | feature test matrix |
| DEVOPS_ENGINEER | prompts/team/DEVOPS_ENGINEER.md | deploy checklist |

Also: prompts/team/README.md
Config: config/harness/team-roster.json → slice_dispatch (use slice-11 review_phase for ship)

"FEATURE TESTER" = L1 QA_ENGINEER (matrix) + L2 VERIFIER (gates) + L6 owner (browser)

═══════════════════════════════════════════════════════════════
LAYER 2 — BUILD (5 harness agents, SEQUENTIAL, one per turn)
═══════════════════════════════════════════════════════════════
Pipeline: ROUTER → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER
Config:   config/harness/slice-orchestration.json, .claude/settings.json

| Order | Role | Prompt | Edits code? | Output |
|-------|------|--------|-------------|--------|
| 1 | ROUTER | prompts/agents/ROUTER.md | NO | route.json |
| 2 | PLANNER | prompts/agents/PLANNER.md | plan.md only | plan.md via plan-template.md |
| 3 | IMPLEMENTER | prompts/agents/IMPLEMENTER.md | YES (scope only) | git diff |
| 4 | REVIEWER | prompts/agents/REVIEWER.md | NO | review-round-{n}.json |
| 5 | VERIFIER | prompts/agents/VERIFIER.md | NO | verification.json + MANIFEST |

REVIEWER must also read: scripts/harness/review-checklist.md
Runner: bash scripts/harness/run-slice.sh (--status | --verify-only | --verify-phase-exit)

NAME COLLISION (do not mix):
  L2 VERIFIER = runs pnpm test gates (harness)
  L3 VERIFIER = evidence OCR (product, prompts/product/VERIFIER.md)

═══════════════════════════════════════════════════════════════
LAYER 3 — RUNTIME (6 product agents, live case workers)
═══════════════════════════════════════════════════════════════
Assess "fully working" by tracing these flows:

| Agent | Prompt | Code |
|-------|--------|------|
| ORCHESTRATOR | prompts/product/ORCHESTRATOR.md | lib/agents/router.ts |
| INTAKE | prompts/product/INTAKE.md | lib/agents/intake/ |
| DRAFTER | prompts/product/DRAFTER.md | lib/agents/drafter/ |
| MONITOR | prompts/product/MONITOR.md | lib/agents/monitor/ |
| VERIFIER (OCR) | prompts/product/VERIFIER.md | stub — Phase 2 |
| ESCALATOR | prompts/product/ESCALATOR.md | lib/escalations/ |

Also: lib/agents/schemas.ts, validators.ts, tools/, lib/jobs/*, lib/llm/nvidia.ts
Loops: lib/loops/case-tick.ts, scheduling.ts, locks.ts, termination.ts

═══════════════════════════════════════════════════════════════
LAYER 4 — TOOLING (plugins + scripts — overlay on L2)
═══════════════════════════════════════════════════════════════
After every IMPLEMENTER diff, in order:
  1. /ponytail-review
  2. code-review (on git diff)
  3. security-guidance (auth/cron/PII/payment changes)
  4. L1 SECURITY_AUDITOR + QA_ENGINEER (parallel)
  5. L2 REVIEWER → review JSON

Scripts (run, never reinvent):
  scripts/harness/run-slice.sh
  scripts/harness/review-checklist.md
  scripts/verify-no-auto-send.sh
  scripts/owner/git-config.sh | git-push.sh | vercel-deploy.sh | supabase-link.sh

Plugins:
  ALWAYS: /ponytail full, supermemory (tag lienliberator), remember at end
  OWNER L6 ONLY: playwright plugin for e2e (NEVER install browsers in sandbox)
  NEVER: feature-dev, ralph-loop, ponytail ultra

═══════════════════════════════════════════════════════════════
LAYER 5 — KNOWLEDGE (ground truth — load ALL before action)
═══════════════════════════════════════════════════════════════

── L5a DOCS (cite §sections) ──
  docs/BUILD_SPEC.md, docs/BUILD_SPEC_AGENTS.md, docs/BUILD_SPEC_LOOPS.md
  docs/HARNESS.md, docs/LOOP_ENGINEERING.md
  docs/RESEARCH_PROTOCOL.md, docs/ANTI_HALLUCINATION.md
  docs/PRE_FLIGHT_CHECKLIST.md, docs/FRONTEND_POLICY.md
  docs/CANONICAL_PATHS.md, docs/FILE_MANIFEST.md, docs/SUPERMEMORY.md
  Ignore unless owner asks: docs/AGENCY_CODEX_PROMPT.md

── L5b CONFIG ──
  MANIFEST.json
  config/harness/slice-orchestration.json
  config/harness/team-roster.json
  config/public-brand.json
  CLAUDE.md, package.json, .env.example

── L5c TEMPLATES ──
  prompts/templates/subagent-dispatch-template.md
  prompts/templates/research-brief-template.md
  prompts/templates/plan-template.md
  prompts/templates/handoff-template.md
  prompts/templates/adr-template.md

── L5d SESSION HISTORY ──
  .claude/session/SESSION_LOG.md
  .claude/session/slice-01/ through slice-11/ (plan, review, summary, handoff)
  New: .claude/session/ship-verify/, .claude/session/phase-2-kickoff/

── L5e CODEBASE ──
  app/, components/, lib/, supabase/migrations/
  tests/unit/, tests/contract/, tests/e2e/, tests/integration/
  lib/loops/agent-harness.ts, lib/loops/dev-loop.ts, lib/state-machine/

Index: prompts/README.md, docs/FILE_MANIFEST.md

FORBIDDEN: Reading only START_HERE + MANIFEST. Load all L5a–L5e.

═══════════════════════════════════════════════════════════════
LAYER 6 — HUMAN (owner — deploy + production secrets)
═══════════════════════════════════════════════════════════════
Phase 1 e2e: DONE (6/6 @smoke green). Owner next steps:
  1. Production .env on Vercel + Supabase (see .env.example)
  2. pnpm owner:supabase-link && db push
  3. pnpm owner:deploy:prod
  4. Manual smoke on production URL

E2E opt-in fallback (sandbox / no bundled Playwright):
  PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e:smoke

═══════════════════════════════════════════════════════════════
ACKNOWLEDGED STATE (do not re-litigate)
═══════════════════════════════════════════════════════════════

- Repo: 8d6ef58 — Phase 1 exit genuinely verified
- harness_state: phase_exit_verified | verification.passed: true
- All gates green on real runs: typecheck, lint, unit (98), contract (18), golden, no-auto-send, e2e:smoke (6/6 @smoke)
- ENV-001: resolved_workaround — opt-in PLAYWRIGHT_CHROME_CHANNEL=chrome in playwright.config.ts; default unchanged for CI
- ENV-002: resolved — verify_phase_exit() captures exit code correctly
- Track A (ship-verify): DONE — do not re-run unless regression
- Next: deploy (L6) + Phase 2 kickoff (Track B)

Model: Sonnet 4.6 1M default. Opus 4.8 if same blocker fails twice.

═══════════════════════════════════════════════════════════════
CROSS-LAYER FLOW — DEPLOY (Track A — owner/L6 priority)
═══════════════════════════════════════════════════════════════

L1 DEVOPS_ENGINEER + SECURITY_AUDITOR (parallel) → deploy checklist
L2 PLANNER → .claude/session/deploy/plan.md + owner-runbook.md
Owner runs: pnpm owner:deploy:prod + Supabase link/push + Vercel env vars

E2E in sandbox without bundled Playwright (opt-in only):
  PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e:smoke

═══════════════════════════════════════════════════════════════
CROSS-LAYER FLOW — PHASE 2 KICKOFF (Track B, priority for Claude)
═══════════════════════════════════════════════════════════════

L0 BOOT: load ALL L5 → run full gate suite:
  cd lienliberator
  bash scripts/harness/run-slice.sh --status
  pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:contract && pnpm test:agents:golden && pnpm verify:no-auto-send
  PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e:smoke   # opt-in if no bundled Playwright

L1 all 9 parallel (Phase 2 BUILD_SPEC focus) → L2 PLANNER
Output: .claude/session/phase-2-kickoff/plan.md + slice-12+ ADR in MANIFEST.memory
NO L2 IMPLEMENTER without owner approval

Phase 2 scope (BUILD_SPEC): Verifier OCR, PDF bundle, rankings cron, Razorpay, ops dashboard, SEO

═══════════════════════════════════════════════════════════════
REVIEW LOOP (mandatory on every code change — do not skip)
═══════════════════════════════════════════════════════════════

L2 IMPLEMENTER writes code
       ↓
L4 /ponytail-review
       ↓
L4 code-review (git diff)
       ↓
L4 security-guidance (if auth/cron/PII/payment)
       ↓
L1 SECURITY_AUDITOR + QA_ENGINEER (parallel)
       ↓
L2 REVIEWER → review-round-{n}.json (approved:true, issue_count:0)
       ↓
issue_count > 0 → L2 IMPLEMENTER fix (max 5 rounds)
       ↓
L2 VERIFIER → gates → update MANIFEST

═══════════════════════════════════════════════════════════════
SUB-AGENT ENVELOPE (copy for each L1 specialist)
═══════════════════════════════════════════════════════════════

## Context
- Project: Unhold (lienliberator) | Owner: thribhuvan003
- Phase: 1 exit verified | harness_state: phase_exit_verified
- Your role: {SPECIALIST_NAME}
- Read: prompts/team/{SPECIALIST}.md + docs/RESEARCH_PROTOCOL.md + docs/ANTI_HALLUCINATION.md

## Task
{one-line mission from dispatch list}

## Constraints
- Read-only — no code edits
- Cite BUILD_SPEC §section for every claim
- SPEC_SILENT if unsure — do not invent
- Output: role template from prompts/templates/

## Files you may read
{spec_refs from team-roster.json + FILE_MANIFEST.md}

═══════════════════════════════════════════════════════════════
IDENTITY
═══════════════════════════════════════════════════════════════

Public: Unhold | GitHub: thribhuvan003/unhold | Codename: lienliberator
Owner: thribhuvan003 <thribhuvan003@gamil.com>
App LLM: NVIDIA MiniMax-M3 (lib/llm/nvidia.ts) — not Anthropic
Secrets: .env.local on owner machine — never ask in chat
Authority: BUILD_SPEC > BUILD_SPEC_AGENTS > migrations > package.json > MANIFEST

═══════════════════════════════════════════════════════════════
LAYER VIOLATIONS (instant stop)
═══════════════════════════════════════════════════════════════

✗ L0 coding without adopting L2 IMPLEMENTER
✗ Skipping L1 specialist dispatch (all 9 required)
✗ L1 specialist editing app code
✗ L2 multiple roles in one turn
✗ Skipping L4 plugins before L2 REVIEWER
✗ L2 REVIEWER with issue_count > 0 proceeding to VERIFIER
✗ L3 product VERIFIER confused with L2 harness VERIFIER
✗ L5 subset read (START_HERE + MANIFEST only)
✗ Setting verification.passed=false when gates are green (regression)
✗ Playwright bundled install retry in sandbox (use PLAYWRIGHT_CHROME_CHANNEL=chrome instead)

═══════════════════════════════════════════════════════════════
START NOW — L0 adopts L2 ROUTER
═══════════════════════════════════════════════════════════════

Read prompts/agents/ROUTER.md. Do NOT code.

Output exactly:
1. LAYERS_LOADED_AUDIT — L0✅ L1(9/9)✅ L2(5/5)✅ L3(6/6)✅ L4✅ L5a–e✅ L6✅
2. Layer stack diagram (confirm you understand separation)
3. State summary (3 lines)
4. L1 dispatch — all 9 specialists IN PARALLEL with missions:
   RESEARCHER: Phase 2 BUILD_SPEC items + spec_refs
   ARCHITECT: slice-12+ boundaries + deps
   DB_ENGINEER: Phase 2 migration preview
   BACKEND_ENGINEER: API/cron/payment gaps
   FRONTEND_ENGINEER: UI surfaces (FRONTEND_POLICY — polish deferred)
   AGENTS_ENGINEER: Verifier OCR + agent wiring
   SECURITY_AUDITOR: Razorpay, OCR PII, cron, ops access
   QA_ENGINEER: Phase 2 test matrix + regression plan
   DEVOPS_ENGINEER: deploy runbook (Vercel, Supabase, Upstash, cron)
5. L2 pipeline if code changes: IMPLEMENTER→L4 plugins→L1 review→REVIEWER→VERIFIER
6. Session end: handoff-template.md + Supermemory save (tag lienliberator) + remember skill

You orchestrate 7 perfect layers. Use every file. Use every agent. Never mix. Never skip. Never solo.
```