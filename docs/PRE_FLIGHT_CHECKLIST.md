# Pre-Flight Checklist — Before Claude Starts Building

**Run once per project bootstrap; re-run after adding harness MD files.**  
**Owner:** TEAM_LEAD

All boxes must be checked before slice-01 IMPLEMENTER begins.

---

## A. Specification corpus

- [ ] `docs/BUILD_SPEC.md` v3 present
- [ ] `docs/BUILD_SPEC_AGENTS.md` present
- [ ] `docs/BUILD_SPEC_LOOPS.md` present
- [ ] `docs/HARNESS.md` present
- [ ] `docs/LOOP_ENGINEERING.md` present
- [ ] `docs/START_HERE.md` present
- [ ] `docs/TEAM_ORCHESTRATION.md` present
- [ ] `docs/RESEARCH_PROTOCOL.md` present
- [ ] `docs/ANTI_HALLUCINATION.md` present
- [ ] `docs/FILE_MANIFEST.md` present

---

## B. Team lead + specialists (prompts/team/)

- [ ] `prompts/team/TEAM_LEAD.md`
- [ ] `prompts/team/RESEARCHER.md`
- [ ] `prompts/team/ARCHITECT.md`
- [ ] `prompts/team/DB_ENGINEER.md`
- [ ] `prompts/team/BACKEND_ENGINEER.md`
- [ ] `prompts/team/FRONTEND_ENGINEER.md`
- [ ] `prompts/team/AGENTS_ENGINEER.md`
- [ ] `prompts/team/SECURITY_AUDITOR.md`
- [ ] `prompts/team/QA_ENGINEER.md`
- [ ] `prompts/team/DEVOPS_ENGINEER.md`
- [ ] `prompts/team/README.md`

---

## C. Harness agents (prompts/agents/)

- [ ] `ROUTER.md`, `PLANNER.md`, `IMPLEMENTER.md`, `REVIEWER.md`, `VERIFIER.md`
- [ ] `scripts/harness/review-checklist.md`
- [ ] `scripts/harness/run-slice.sh` executable
- [ ] `config/harness/slice-orchestration.json`
- [ ] `config/harness/team-roster.json`

---

## D. Product agent prompts (prompts/product/)

- [ ] `ORCHESTRATOR.md`, `INTAKE.md`, `DRAFTER.md`, `MONITOR.md`, `VERIFIER.md`, `ESCALATOR.md`
- [ ] `prompts/README.md` (harness vs product vs team)

---

## E. Templates (prompts/templates/)

- [ ] `plan-template.md`
- [ ] `handoff-template.md`
- [ ] `research-brief-template.md`
- [ ] `adr-template.md`
- [ ] `subagent-dispatch-template.md`

---

## F. Config + state

- [ ] `MANIFEST.json` valid JSON, `active_slice` set
- [ ] `.claude/settings.json` harness limits
- [ ] `CLAUDE.md` (workspace + `lienliberator/CLAUDE.md`)
- [ ] `.gitignore` includes `.claude/session/`
- [ ] `package.json` scripts: typecheck, verify:no-auto-send, test:*
- [ ] `.env.example` documents 25+ vars

---

## G. Loop infrastructure (stubs OK pre-slice-09)

- [ ] `lib/loops/case-tick.ts`
- [ ] `lib/agents/router.ts`
- [ ] `lib/jobs/enqueue.ts`
- [ ] `lib/loops/agent-harness.ts`
- [ ] `supabase/database.types.ts`

---

## H. Verification commands pass

```bash
cd lienliberator
pnpm install
pnpm typecheck          # exit 0
pnpm verify:no-auto-send  # exit 0
bash scripts/harness/run-slice.sh --status
```

- [ ] `pnpm typecheck` exit 0
- [ ] `pnpm verify:no-auto-send` exit 0
- [ ] Harness status prints active slice

---

## I. Team Lead readiness

- [ ] Team Lead has read `docs/START_HERE.md`
- [ ] Team Lead understands one harness role per turn
- [ ] Team Lead knows specialist dispatch matrix (`team-roster.json`)
- [ ] Session dir exists: `.claude/session/slice-01/`

---

## J. Explicitly NOT required before slice-01

These are built **during** slices — do not block pre-flight:

- Migrations 002–010
- `app/` routes and pages
- `tests/` (except harness scripts)
- Full LLM agent wiring
- E2E smoke tests

---

## Sign-off

| Role | Status | Date |
|------|--------|------|
| TEAM_LEAD | ☐ ready | |
| Human operator | ☐ ready | |

When all checked → proceed to **RESEARCHER brief for slice-01** → **PLANNER** → **IMPLEMENTER**.