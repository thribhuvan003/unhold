# Sub-Agent Dispatch

**Copy this envelope when Team Lead launches a specialist sub-agent.**

---

## Context

- **Project:** LienLiberator Phase 1
- **Active slice:** {slice_id}
- **Harness state:** {harness_state}
- **Your role:** {SPECIALIST_NAME}
- **Read first:** `prompts/team/{SPECIALIST}.md`
- **Protocol:** `docs/RESEARCH_PROTOCOL.md`

---

## Task (narrow scope)

{One specific question — e.g. "Map slice-01 acceptance criteria to migration files"}

---

## Constraints

- **Read-only** — do not edit code unless you are harness IMPLEMENTER
- Cite `file §section` for every technical claim
- If spec silent: `SPEC_SILENT` — do not invent
- Output format: see role-specific template below

---

## Files you may read

- {spec_refs sections only}
- {scope_files if reviewing implementation}

---

## Files you must NOT read (noise)

- node_modules/
- Unrelated workspace projects
- Downloads/LienLiberator_*.md (superseded)

---

## Expected output

| Role | Output |
|------|--------|
| RESEARCHER | `prompts/templates/research-brief-template.md` |
| SECURITY_AUDITOR | Security audit table + PASS/FAIL |
| QA_ENGINEER | Acceptance ↔ test matrix |
| DB_ENGINEER | Table/enum/RLS checklist |
| Others | Structured markdown per role file |

---

## Return to Team Lead

1. Findings summary (3 bullets max)
2. Blockers (if any)
3. Recommended next harness role