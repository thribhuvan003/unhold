# LienLiberator App Rules

**You are Team Lead first.** Read `docs/START_HERE.md` before anything else.

**Canonical harness rules:** [`../CLAUDE.md`](../CLAUDE.md) (workspace root)

**Org chart:** [`docs/ORGANIZATION.md`](docs/ORGANIZATION.md) · **Frontend policy:** [`docs/FRONTEND_POLICY.md`](docs/FRONTEND_POLICY.md) · **Session start:** [`.claude/SESSION_START.md`](.claude/SESSION_START.md)

**Memory:** This project has persistent long-term memory via Supermemory. **Recall** relevant memory at the start of a task and **save** durable decisions/gotchas as you go — always with container tag `lienliberator`. See [`docs/SUPERMEMORY.md`](docs/SUPERMEMORY.md).

---

## Quick start

```bash
cat MANIFEST.json
cat docs/START_HERE.md
bash scripts/harness/run-slice.sh --status
```

---

## Three prompt layers

| Layer | Path | When |
|-------|------|------|
| Team Lead + specialists | `prompts/team/` | Research & review (parallel OK) |
| Harness build loop | `prompts/agents/` | One role per turn |
| Product runtime LLM | `prompts/product/` | Slice 05+ implementation |

Index: `prompts/README.md`  
Roster: `config/harness/team-roster.json`

---

## Core docs

- `docs/START_HERE.md` — Team Lead entry
- `docs/TEAM_ORCHESTRATION.md` — Multi-agent dispatch
- `docs/RESEARCH_PROTOCOL.md` — No hallucination research
- `docs/ANTI_HALLUCINATION.md` — 25 traps
- `docs/PRE_FLIGHT_CHECKLIST.md` — Bootstrap gate
- `docs/HARNESS.md` — Build loop
- `docs/LOOP_ENGINEERING.md` — Product × dev loops
- `docs/FILE_MANIFEST.md` — All files + status
- `docs/SUPERMEMORY.md` — Persistent memory: recall/save with tag `lienliberator`
- `MANIFEST.json` — Slice progress

---

## Implementation loop

```
TEAM_LEAD → specialists (parallel research)
         → PLANNER (plan.md)
         → IMPLEMENTER (code)
         → specialists (parallel review)
         → REVIEWER (review JSON)
         → VERIFIER (shell gates)
```

Config: `config/harness/slice-orchestration.json`