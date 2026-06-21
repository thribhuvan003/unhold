# Research Protocol — No Hallucination

**Applies to:** RESEARCHER specialist, PLANNER, all specialists before planning/review  
**Output format:** `prompts/templates/research-brief-template.md`

---

## 1. Golden rule

> **If you cannot cite `file.md §section` or `migrations/00N.sql` line, you do not know it.**

Say `SPEC_SILENT` and stop. Do not guess.

---

## 2. Allowed sources (priority order)

| Priority | Source | Use for |
|----------|--------|---------|
| 1 | `docs/BUILD_SPEC.md` | API, states, DB, phases |
| 2 | `docs/BUILD_SPEC_AGENTS.md` | Agent schemas, tools, thresholds |
| 3 | `docs/BUILD_SPEC_LOOPS.md` | case-tick, jobs, idempotency |
| 4 | `supabase/migrations/*.sql` | Actual columns, enums, RLS |
| 5 | `supabase/database.types.ts` | TypeScript shapes (may lag migrations) |
| 6 | `config/harness/slice-orchestration.json` | Slice scope, acceptance |
| 7 | `package.json` | Pinned dependency versions |
| 8 | `MANIFEST.memory.decisions` | Prior ADRs |

### Forbidden sources

- User's old `LienLiberator_*.md` in Downloads (superseded by BUILD_SPEC)
- swarmfix localStorage demo
- "Standard practice" without spec citation
- Invented RBI/NCRP/CMS API documentation
- Generic Next.js tutorials for auth (guest JWT is custom per §7)

---

## 3. Research procedure

### Step 1 — Scope the question

Write one sentence: *"What must be true for slice-XX acceptance criterion Y?"*

### Step 2 — Load only relevant sections

From slice `spec_refs` in orchestration JSON. **Never load entire BUILD_SPEC** into working memory.

### Step 3 — Extract facts

Each fact as:

```
FACT-{id}: {statement}
SOURCE: {path} §{section} or line {n}
CONFIDENCE: high|medium (medium = needs migration verify)
```

### Step 4 — Cross-check traps

Run `docs/ANTI_HALLUCINATION.md` checklist for slice domain.

### Step 5 — Emit brief

Use research brief template. Include `OPEN_QUESTIONS` and `SPEC_GAPS`.

---

## 4. Citation format

```markdown
- case_status has 13 values including `human_escalation`
  → BUILD_SPEC.md §4.1
- agent_role enum in migration 001 uses lowercase
  → supabase/migrations/001_extensions_enums.sql L26-28
- database.types.ts uses UPPERCASE agent_role
  → supabase/database.types.ts L780 → CONFLICT: resolve in slice-01
```

---

## 5. Parallel research split

Team Lead may split slice research:

| Sub-agent | Questions |
|-----------|-----------|
| RESEARCHER-A | DB tables, enums, RLS for slice |
| RESEARCHER-B | API routes, auth, rate limits |
| RESEARCHER-C | Tests required, acceptance mapping |

Merge briefs; dedupe facts; flag conflicts.

---

## 6. Before PLANNER writes plan.md

Research brief must include:

- [ ] All `acceptance_criteria` from orchestration mapped to spec sections
- [ ] All `scope_files` purpose stated
- [ ] All `forbidden_in_slice` risks noted
- [ ] Enum/table list matches BUILD_SPEC §5.1 (slice-01)
- [ ] No SPEC_SILENT items without `TODO(spec)` + human_gate
- [ ] Conflict register (migration vs types vs spec)

---

## 7. Before REVIEWER approves

Re-research only **changed domains**:

- New API route → cite §6
- New agent → cite BUILD_SPEC_AGENTS
- New migration → cite §5 + actual SQL

---

## 8. Verification commands (research validation)

```bash
# Enum in migrations
rg "case_status" supabase/migrations/

# Forbidden patterns
pnpm verify:no-auto-send

# Scope files exist in orchestration
jq '.slices[] | select(.id=="slice-01") | .scope_files[]' config/harness/slice-orchestration.json

# Tables claimed in plan
rg "CREATE TABLE" supabase/migrations/
```

---

## 9. SPEC_SILENT handling

When spec is silent:

1. Check migrations — if still silent:
2. Add to plan.md:

```markdown
### TODO(spec): {topic}
- Needed for: {acceptance criterion}
- Proposed default: {minimal safe choice}
- human_gate: true
- ADR candidate: yes
```

3. Append `MANIFEST.memory.spec_gaps`

**Never** silently pick an enum name, route path, or column type.

---

## 10. Research anti-patterns

| Anti-pattern | Fix |
|--------------|-----|
| "RBI API returns…" | SPEC_SILENT — user files manually |
| "We'll use Inngest because…" | Forbidden — agent_jobs + cron |
| "ESCALATION_L1 state" | Wrong — `escalation` + level L1 |
| "Supabase anon for guest" | Wrong — GUEST_JWT_SECRET |
| Copying swarmfix patterns | Out of scope — BUILD_SPEC only |

---

**Template:** `prompts/templates/research-brief-template.md`