# Loop Engineering — Product Loops × Dev Loops

LienLiberator is built **with loops** and **for loops**. This document unifies:

1. **Product loops** — how a user's freeze case progresses (runtime)
2. **Dev loops** — how Claude builds the software (harness)
3. **Shared patterns** — state machines, gates, idempotency, human-in-the-loop

---

## 1. Why Loops?

Bank freeze cases are not one-shot CRUD. They are:

```
upload evidence → classify → checklist → draft letter → wait → escalate → verify release
```

Building the software is the same shape:

```
plan slice → implement → review → fix → verify → next slice
```

**Karpathy insight:** Replace one monolithic agent with a **pipeline of narrow agents** that pass structured state forward. Same architecture at build-time and run-time.

---

## 2. Side-by-Side Map

| Concept | Product (runtime) | Dev (harness) |
|---------|-------------------|---------------|
| Orchestrator | `lib/agents/router.ts` + `agent_jobs` | `ROUTER` + `slice-orchestration.json` |
| Planner | Playbook selection (INTAKE) | `PLANNER` → `plan.md` |
| Worker | INTAKE, DRAFTER, MONITOR, VERIFIER | `IMPLEMENTER` |
| QA gate | Zod + validators + human_gate | `REVIEWER` + checklist |
| CI gate | API guards + cron | `VERIFIER` + `run-slice.sh` |
| State store | Postgres `cases`, `action_logs` | `MANIFEST.json` |
| Event log | `swarm_events`, `action_logs` | `.claude/session/*` |
| Human escalation | `human_gate_queue`, HUMAN_OPS | `blocked` + handoff.md |
| Idempotency | `Idempotency-Key`, job keys | slice IDs, fix_round |
| Cost cap | $2/case → human_escalation | max 5 review + 3 verify rounds |
| Forbidden actions | no auto-send | no scope creep |

---

## 3. Product Loop (Runtime)

### 3.1 Case lifecycle loop

```
┌──────────┐   evidence    ┌────────────────┐  intake.job   ┌────────────┐
│   new    │──────────────►│ intake_scoping │──────────────►│ monitoring │
└──────────┘               └────────────────┘               └─────┬──────┘
                                                                  │
                     ┌────────────────────────────────────────────┘
                     ▼
              ┌──────────────────┐   bundle   ┌────────────┐   mark_sent   ┌───────────────────┐
              │ evidence_building│───────────►│ escalation │──────────────►│ awaiting_response │
              └──────────────────┘            └────────────┘               └─────────┬─────────┘
                                                                                    │
                                          ┌─────────────────────────────────────────┘
                                          ▼
                                   ┌──────────┐   confirm   ┌──────────┐
                                   │ verified │────────────►│ resolved │
                                   └──────────┘             └──────────┘
```

**Enforced by:** `lib/state-machine/transitions.ts` — not LLM.

### 3.2 Agent job loop

```
trigger (status change, cron, upload)
    → ORCHESTRATOR maps case.status → job_type
    → INSERT agent_jobs (idempotent key)
    → cron POST /internal/jobs/process
    → runner(agent) → Zod output
    → validators.ts
    → swarm_events + action_logs
    → optional enqueue_human_gate
    → Realtime → UI NextStepsCard
```

**Agents are narrow:**

| Agent | Single job |
|-------|------------|
| INTAKE | Classify freeze_reason + checklist |
| DRAFTER | One letter draft |
| MONITOR | One cron tick |
| VERIFIER | One evidence OCR verdict |

No agent "does the whole case."

### 3.3 Escalation loop (L1→L3)

```
draft L1 → user approves → user sends manually → mark-sent + proof
    → wait 7d (MONITOR)
    → unlock L2 (proof gate)
    → draft L2 → … → L3
```

**Proof gates are a loop breaker** — same role as REVIEWER in dev loop.

### 3.4 Human-in-the-loop product gates

| Gate | Trigger |
|------|---------|
| INTAKE human_gate | confidence < 0.75, court_order, tax_attachment, mule |
| DRAFTER human_review | always before export |
| VERIFIER human_gate | confidence < 0.85, forgery_risk |
| HUMAN_OPS | cost cap, panic keywords |

Dev harness **mirrors** this: REVIEWER = automated human_gate before merge.

---

## 4. Dev Loop (Harness)

### 4.1 Slice pipeline

```
MANIFEST.active_slice
    → ROUTER (deps check)
    → PLANNER (scope contract)
    → IMPLEMENTER (code)
    → REVIEWER (spec check) ──fix loop──┐
    → VERIFIER (shell gates) ──fix loop─┘
    → MANIFEST slice verified
    → active_slice++
```

### 4.2 Phase 1 = 11 nested loops

Each slice is one outer-loop iteration. Inner loops are review/verify fixes.

```
for slice in [01..11]:
    route(slice)
    plan(slice)
    repeat until review.clean or blocked:
        implement(slice)
        review(diff, BUILD_SPEC)
    repeat until verify.pass or blocked:
        run_gates(slice)
    mark_verified(slice)
assert phase_exit_e2e()
```

Config: `config/harness/slice-orchestration.json`

### 4.3 Memory loops (session continuity)

| Store | Written by | Read by |
|-------|------------|---------|
| `MANIFEST.json` | every agent at end | every agent at start |
| `plan.md` | PLANNER | IMPLEMENTER, REVIEWER |
| `review-round-N.json` | REVIEWER | IMPLEMENTER |
| `verification.json` | VERIFIER | ROUTER |
| `handoff.md` | any agent on stop | next session ROUTER |
| `summary.md` | VERIFIER on success | next slice PLANNER |

**Supermemory (product)** stores redacted case facts. **Session dir (dev)** stores build narrative. Do not mix.

---

## 5. Unified State Machine Pattern

Both loops use the same **typed state + guarded transitions**:

### Product: `CaseStatus`

```typescript
// lib/state-machine/types.ts
type CaseStatus =
  | 'new' | 'intake_scoping' | 'monitoring' | ...
```

### Dev: `HarnessState`

```typescript
// lib/loops/agent-harness.ts
type HarnessState =
  | 'idle' | 'routing' | 'planning' | 'implementing' | ...
```

### Shared rules

1. **Single writer** — only `transitions.ts` / `run-slice.sh --complete-slice` advance canonical state
2. **Guards fail closed** — 422 / blocked, not silent continue
3. **Append-only audit** — action_logs / review-round JSON
4. **Idempotency keys** — job enqueue / slice verify

---

## 6. Feedback Loops

### 6.1 Product feedback

```
user_action → action_logs → MONITOR tick → user_actions row → NextStepsCard
```

User sees **one** next action, not raw swarm log.

### 6.2 Dev feedback

```
REVIEWER issue → IMPLEMENTER fix → smaller diff → REVIEWER
VERIFIER fail → IMPLEMENTER fix → faster CI
```

### 6.3 Cross-loop learning

Decisions in `MANIFEST.memory.decisions[]` become conventions:

```json
{
  "id": "ADR-001",
  "date": "2026-06-20",
  "decision": "Guest JWT in lib/auth/guest.ts, not Supabase anon",
  "spec_ref": "BUILD_SPEC.md §7"
}
```

PLANNER reads `memory.decisions` before planning.

---

## 7. Anti-Patterns (Both Loops)

| Anti-pattern | Product failure | Dev failure |
|--------------|-------------------|-------------|
| Mega-agent | Hallucinated NCRP ID | Invented API route |
| Skip gate | Auto-sent email lawsuit | Shipped ESCALATION_L1 enum |
| Mutable history | Fraud audit trail broken | Can't resume session |
| Scope creep | Feature kills MVP | Slice 05 builds Drafter |
| Float money | Wrong rupee amounts | N/A |

---

## 8. Metrics

### Product (beta)

- ≥30% verified release @90d
- <3 human touches/case
- LLM ≤₹800/case

### Dev (harness)

- 0 blockers at slice verify
- `verify-no-auto-send` always green
- fix_round median < 2 per slice
- Time per slice ≤ 1 week (BUILD_SPEC §13)

---

## 9. Implementation Checklist

- [x] `lib/loops/agent-harness.ts` — harness state types
- [x] `lib/loops/dev-loop.ts` — executable Plan→Implement→Test loop
- [x] `lib/loops/case-tick.ts` + `router.ts` — product INNER/OUTER loops (stub runner until slice-05)
- [x] `prompts/product/*` — runtime agent prompts (6 agents)
- [x] `prompts/agents/*` — harness agent prompts (5 roles)
- [x] `.claude/settings.json` — loop limits + forbidden patterns
- [x] `docs/FILE_MANIFEST.md` — full file tree with status
- [ ] `run-slice.sh` TS CLI wrapper (optional; bash gates work today)
- [ ] MANIFEST synced after every agent turn (process discipline)
- [x] Product ORCHESTRATOR ≠ harness ROUTER (`prompts/README.md`)
- [x] Session dir gitignored (`.gitignore`)
- [ ] Phase exit E2E in slice-11 verification

---

## 10. Reading Order

1. `CLAUDE.md` — rules
2. `docs/HARNESS.md` — dev loop detail
3. This file — mental model
4. `config/harness/slice-orchestration.json` — slice truth
5. `BUILD_SPEC.md` §13 — product phase map

**The loops are the product.** Code is the residue of running them correctly.