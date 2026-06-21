# Team Orchestration — Claude as Team Lead

**Audience:** Claude Team Lead + human operator  
**Companion:** `prompts/team/TEAM_LEAD.md`, `config/harness/team-roster.json`

---

## 1. Org chart

```
                    TEAM_LEAD (Claude)
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
    Harness Loop      Specialist Pool     Product Agents
    (build-time)      (research/review)   (runtime — slice 05+)
         │                 │                 │
    ROUTER            RESEARCHER            INTAKE
    PLANNER           ARCHITECT             DRAFTER
    IMPLEMENTER       DB_ENGINEER           MONITOR
    REVIEWER          BACKEND_ENGINEER      VERIFIER
    VERIFIER          FRONTEND_ENGINEER     ESCALATOR
                      AGENTS_ENGINEER
                      SECURITY_AUDITOR
                      QA_ENGINEER
                      DEVOPS_ENGINEER
```

**Harness agents** mutate the repo (IMPLEMENTER only).  
**Specialists** read specs + diffs; emit briefs and findings.  
**Product agents** run in production after Phase 1 ships.

---

## 2. Team Lead responsibilities

1. **Session routing** — Read MANIFEST → pick harness role OR dispatch specialists
2. **Parallel dispatch** — During PLANNER/REVIEWER, launch 2–4 specialists concurrently
3. **Conflict resolution** — BUILD_SPEC > BUILD_SPEC_AGENTS > migrations > package.json
4. **Scope enforcement** — Reject work outside `scope_files`
5. **Gate ownership** — Only VERIFIER marks slice verified; Team Lead runs `--complete-slice` after human confirms
6. **Memory** — Append ADRs to `MANIFEST.memory.decisions`
7. **No hero coding** — Team Lead adopts IMPLEMENTER.md before writing application code

---

## 3. Dispatch protocol

### Sub-agent prompt envelope

When dispatching a specialist sub-agent, always pass:

```markdown
## Context
- Project: LienLiberator Phase 1
- Active slice: {slice_id}
- Harness state: {harness_state}
- Your role: {SPECIALIST_NAME}
- Read: prompts/team/{SPECIALIST}.md

## Task
{specific question — narrow scope}

## Constraints
- Read-only unless you are IMPLEMENTER harness role
- Cite BUILD_SPEC section for every technical claim
- If spec silent: say "SPEC_SILENT" — do not invent
- Output: prompts/templates/research-brief-template.md format

## Files you may read
{list from spec_refs + scope_files}
```

### Parallel safe combinations

| Phase | Parallel OK |
|-------|-------------|
| RESEARCHER + DB + SECURITY | Yes (slice-01 plan) |
| IMPLEMENTER + IMPLEMENTER | **No** |
| REVIEWER + SECURITY + QA | Yes (read-only) |
| ROUTER + PLANNER | **No** (sequential harness) |

---

## 4. Slice → specialist matrix

| Slice | Title | Plan-phase specialists | Review-phase specialists |
|-------|-------|------------------------|--------------------------|
| 01 | Migrations + RLS | RESEARCHER, DB_ENGINEER, ARCHITECT, SECURITY | DB, SECURITY |
| 02 | Guest + CRUD | RESEARCHER, BACKEND, FRONTEND, SECURITY | BACKEND, QA |
| 03 | Evidence upload | RESEARCHER, BACKEND, SECURITY | BACKEND, QA |
| 04 | State machine | RESEARCHER, BACKEND, ARCHITECT, QA | BACKEND, QA |
| 05 | Intake classifier | RESEARCHER, AGENTS, SECURITY | AGENTS, SECURITY, QA |
| 06 | NextStepsCard | FRONTEND, BACKEND, QA | FRONTEND, QA |
| 07 | Drafter L1–L3 | AGENTS, SECURITY, QA | AGENTS, SECURITY |
| 08 | Proof gates | BACKEND, FRONTEND, SECURITY | BACKEND, SECURITY, QA |
| 09 | Cron tick | AGENTS, DEVOPS, ARCHITECT | DEVOPS, AGENTS, QA |
| 10 | Disclaimers | FRONTEND, SECURITY | SECURITY, FRONTEND |
| 11 | Ops queue | BACKEND, FRONTEND, QA, SECURITY | QA (E2E), SECURITY |

Machine-readable: `config/harness/team-roster.json`

---

## 5. Integration with harness loop

| Harness state | Team Lead action |
|---------------|------------------|
| idle / routing | Adopt ROUTER.md OR dispatch RESEARCHER for next slice |
| planning | Dispatch plan-phase specialists → adopt PLANNER.md → merge briefs |
| implementing | Adopt IMPLEMENTER.md only |
| reviewing | Dispatch review-phase specialists → adopt REVIEWER.md |
| verifying | Adopt VERIFIER.md; run `run-slice.sh --verify-only` |
| fixing | Adopt IMPLEMENTER.md with issue list |
| blocked | Human escalation; write handoff.md |

---

## 6. Research → Plan → Code chain

```
RESEARCHER briefs (cited facts)
    ↓
PLANNER plan.md (tasks, tests, risks)
    ↓
ARCHITECT sign-off on plan boundaries (optional comment in plan.md)
    ↓
IMPLEMENTER code (scope_files only)
    ↓
Specialist diff audits (optional notes → REVIEWER)
    ↓
REVIEWER review-round-N.json
    ↓
VERIFIER verification.json
```

---

## 7. Quality bar (elite team)

| Dimension | Standard |
|-----------|----------|
| Spec fidelity | Every API route, enum, column cited in plan |
| Security | SECURITY_AUDITOR pass before REVIEWER approves slices 02+ |
| Tests | QA_ENGINEER confirms acceptance criteria have test mapping |
| Agents | AGENTS_ENGINEER confirms Zod + forbidden tools |
| Ops | DEVOPS_ENGINEER confirms cron/env for slice 09+ |
| No regression | `pnpm verify:no-auto-send` + prior slices still verified in MANIFEST |

---

## 8. Escalation paths

| Situation | Action |
|-----------|--------|
| Spec conflict | Team Lead documents ADR; human decides if unresolved |
| Specialist disagreement | BUILD_SPEC tie-break; cite section in plan |
| 5 review rounds exceeded | `harness_state: blocked` |
| 3 verify failures | blocked + handoff |
| Invented requirement | RESEARCHER flags; remove from plan |

---

## 9. What Team Lead never does

- Implements without `plan.md`
- Skips specialist research on slices 01, 04, 05, 08, 09
- Merges product agent prompts into harness prompts
- Declares done without VERIFIER `passed: true`
- Allows float rupees, auto-send, or legacy status enums

---

**Next read:** `docs/RESEARCH_PROTOCOL.md`, `prompts/team/TEAM_LEAD.md`