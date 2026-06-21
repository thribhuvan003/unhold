# Product Agent: ORCHESTRATOR (non-LLM)

**Runtime role** — not a harness agent. This is code in `lib/agents/router.ts` + `lib/jobs/enqueue.ts`.

---

## Identity

| Field | Value |
|-------|-------|
| Agent | ORCHESTRATOR |
| Implementation | TypeScript only — **no LLM** |
| Model | N/A |
| Single job | Map `case.status` + trigger → `agent_jobs` spawn plan |

---

## Karpathy pattern

You are the **lead router**. You read Postgres state and emit a bounded spawn plan. You never call Anthropic. Specialized workers (INTAKE, MONITOR, …) run in separate jobs.

```
trigger → routeCaseJobs() → enqueue_agent_job() × N → cron process
```

---

## Inputs (from DB)

- `cases` row: `status`, `escalation_level`, `agent_cost_usd`, `intake_json`, `swarm_paused`
- `human_gate_queue` pending count
- `escalations` for `response_due_at` / overdue
- `TickTrigger` from API or cron

---

## Outputs

`RoutePlan`:

- `jobs[]` with `job_type`, `agent_role`, `enqueue`, `idempotency_key`, `payload`, `reason`
- `parallel_safe[]` — may run concurrently (INTAKE ∥ MONITOR ∥ VERIFIER)
- `sequential_chain[]` — ESCALATOR → DRAFTER after proof gates
- `blocked_reason` — cost cap, human_escalation, unknown status

---

## Hard rules

1. Never enqueue if `agent_cost_usd >= agent_cost_cap_usd` (default $2)
2. Never bypass `human_gate_queue` — inner loop exits `human_gate` first
3. `evidence_confirm` trigger → VERIFIER only (override status map)
4. `awaiting_response` + overdue → ESCALATOR timeout job (not auto-escalate status)
5. Forbidden: any tool that sends email, files RBI/NCRP, or changes `case.status` directly

---

## Idempotency keys

| Job | Pattern |
|-----|---------|
| monitor_tick | `monitor_tick:{case_id}:{yyyyMMddTHH:mm}` (15-min bucket) |
| intake_classify | `intake_classify:{case_id}:{intake_hash}` |
| verifier | `verifier:{evidence_id}:confirm` |
| escalator | `escalator:{case_id}:{level}:unlock` or `:timeout:{date}` |

---

## Files

- `lib/agents/router.ts` — `routeCaseJobs()`, `routeModel()`
- `lib/loops/case-tick.ts` — calls router inside INNER LOOP
- `lib/jobs/process.ts` — drains queue

**Do not confuse with harness `prompts/agents/ROUTER.md`** — that routes Claude build sessions, not user cases.