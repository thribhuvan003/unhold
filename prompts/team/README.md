# LienLiberator — Agent Team Index

Three prompt layers. **Never mix them.**

| Layer | Directory | Purpose |
|-------|-----------|---------|
| **Team** | `prompts/team/` | Elite specialists — research & review (read-only) |
| **Harness** | `prompts/agents/` | Build loop — ROUTER→VERIFIER (one role/turn) |
| **Product** | `prompts/product/` | Runtime LLM workers inside live cases |

**Team Lead:** `prompts/team/TEAM_LEAD.md` — start at `docs/START_HERE.md`

---

## Team roster

| File | Role | Parallel? | Codes? |
|------|------|-----------|--------|
| `TEAM_LEAD.md` | Orchestrator | — | Only as IMPLEMENTER |
| `RESEARCHER.md` | Spec facts | Yes | No |
| `ARCHITECT.md` | Boundaries | Yes | No |
| `DB_ENGINEER.md` | SQL/RLS | Yes | No |
| `BACKEND_ENGINEER.md` | API/jobs | Yes | No |
| `FRONTEND_ENGINEER.md` | UI/UX | Yes | No |
| `AGENTS_ENGINEER.md` | LLM agents | Yes | No |
| `SECURITY_AUDITOR.md` | Security | Yes | No |
| `QA_ENGINEER.md` | Tests | Yes | No |
| `DEVOPS_ENGINEER.md` | Cron/env | Yes | No |

Config: `config/harness/team-roster.json`

---

## When Team Lead dispatches whom

### Plan phase (before plan.md)

| Slice | Dispatch |
|-------|----------|
| 01 | RESEARCHER + DB_ENGINEER + ARCHITECT + SECURITY |
| 02 | RESEARCHER + BACKEND + FRONTEND + SECURITY |
| 03 | RESEARCHER + BACKEND + SECURITY |
| 04 | RESEARCHER + BACKEND + ARCHITECT + QA |
| 05 | RESEARCHER + AGENTS + SECURITY |
| 06 | FRONTEND + BACKEND + QA |
| 07 | AGENTS + SECURITY + QA |
| 08 | BACKEND + FRONTEND + SECURITY |
| 09 | AGENTS + DEVOPS + ARCHITECT |
| 10 | FRONTEND + SECURITY |
| 11 | BACKEND + FRONTEND + QA + SECURITY |

### Review phase (before review JSON)

Always: **SECURITY_AUDITOR** + **QA_ENGINEER**  
Plus domain: DB (01), BACKEND (02–05), FRONTEND (06+), AGENTS (05–09)

---

## Harness roles (sequential)

| Order | File | Writes code? |
|-------|------|--------------|
| 1 | `agents/ROUTER.md` | No |
| 2 | `agents/PLANNER.md` | plan.md only |
| 3 | `agents/IMPLEMENTER.md` | Yes |
| 4 | `agents/REVIEWER.md` | No |
| 5 | `agents/VERIFIER.md` | No |

---

## Name collisions

| Name | Team/Harness | Product |
|------|--------------|---------|
| VERIFIER | Shell test gates | Evidence OCR |
| ROUTER | Session routing | Use ORCHESTRATOR.md + router.ts |

---

## Templates

- `prompts/templates/subagent-dispatch-template.md`
- `prompts/templates/research-brief-template.md`
- `prompts/templates/plan-template.md`
- `prompts/templates/handoff-template.md`
- `prompts/templates/adr-template.md`

---

## Docs

- `docs/TEAM_ORCHESTRATION.md`
- `docs/RESEARCH_PROTOCOL.md`
- `docs/ANTI_HALLUCINATION.md`
- `docs/PRE_FLIGHT_CHECKLIST.md`