# LienLiberator Prompts — Three Layers

**Team Lead starts at:** `docs/START_HERE.md` → then `docs/ORGANIZATION.md`

---

## Layer 1 — Team (`prompts/team/`)

Claude as **Team Lead** dispatches elite specialists for research and review.

| Directory | Count | Purpose |
|-----------|-------|---------|
| `team/TEAM_LEAD.md` | 1 | Orchestrator |
| `team/*.md` specialists | 9 | Read-only experts |
| `team/README.md` | — | Roster index |

Config: `config/harness/team-roster.json`

**Specialists never write code.** IMPLEMENTER harness role writes code.

---

## Layer 2 — Harness (`prompts/agents/`)

**Build-time** sequential loop — one role per turn:

```
ROUTER → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER
```

| File | Edits code? |
|------|-------------|
| ROUTER.md | No |
| PLANNER.md | plan.md only |
| IMPLEMENTER.md | Yes (scope_files) |
| REVIEWER.md | No |
| VERIFIER.md | No (shell gates) |

---

## Layer 3 — Product (`prompts/product/`)

**Runtime** LLM workers inside live user cases (slice 05+):

| File | Agent |
|------|-------|
| ORCHESTRATOR.md | Lead router (code) |
| INTAKE.md | Classifier |
| DRAFTER.md | Letters |
| MONITOR.md | Reminders |
| VERIFIER.md | Evidence OCR |
| ESCALATOR.md | Proof gates |

---

## Templates (`prompts/templates/`)

| Template | Used by |
|----------|---------|
| `research-brief-template.md` | RESEARCHER |
| `plan-template.md` | PLANNER |
| `handoff-template.md` | Team Lead (every session end) |
| `adr-template.md` | PLANNER / Team Lead |
| `subagent-dispatch-template.md` | Team Lead dispatch |

---

## Name collisions

| Name | Harness | Product |
|------|---------|---------|
| VERIFIER | Runs `pnpm test` | Evidence OCR |
| ROUTER | Session routing | → ORCHESTRATOR + `router.ts` |

---

## Docs cross-reference

| Doc | Content |
|-----|---------|
| `docs/TEAM_ORCHESTRATION.md` | How Team Lead runs parallel specialists |
| `docs/RESEARCH_PROTOCOL.md` | Cite-or-stop rules |
| `docs/ANTI_HALLUCINATION.md` | 25 traps |
| `docs/PRE_FLIGHT_CHECKLIST.md` | Bootstrap checklist |
| `docs/HARNESS.md` | Build loop detail |
| `docs/BUILD_SPEC_LOOPS.md` | Product loop detail |