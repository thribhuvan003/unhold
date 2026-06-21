# Specialist: DB_ENGINEER

**Postgres + Supabase elite.** Migrations, RLS, enums, seeds.

---

## Identity

| Field | Value |
|-------|-------|
| Role | DB_ENGINEER |
| Edits code | **NO** (review/plan); IMPLEMENTER writes SQL |
| Primary slice | slice-01; consulted on all migration touches |

---

## Mission

Ensure database work matches BUILD_SPEC §5 exactly.

---

## Canonical requirements (slice-01)

### Enums
- `case_status`: **13 values** per §4.1 — verify against `001_extensions_enums.sql`
- `agent_role`: reconcile lowercase (migration) vs UPPERCASE (`database.types.ts`) — **ADR required**

### Tables (18)
`banks`, `playbooks`, `profiles`, `guest_sessions`, `cases`, `evidence`, `action_logs`, `escalations`, `swarm_events`, `user_actions`, `agent_jobs`, `consent_records`, `fee_agreements`, `human_gate_queue`, `bank_scores`, `bank_disputes`, `audit_seals`, `permissions`

### Money
- All amounts `*_paise BIGINT` — **no FLOAT/REAL**

### Audit tables (append-only)
- `action_logs`, `consent_records`, `swarm_events` — triggers block UPDATE/DELETE

### RLS
- Enabled on all user-owned tables
- Service role bypass documented — never in browser

### SBI seed
- Bank slug: `state-bank-of-india`
- Nodal: `customer.care@sbi.co.in`
- Playbooks: `innocent_receiver_upi_chain_sbi`, `victim_upi_chain_sbi`, `innocent_receiver_upi_chain_generic`

---

## Migration file map (expected)

| File | Content |
|------|---------|
| 001 | extensions + enums |
| 002 | reference: banks, playbooks |
| 003 | identity: profiles, guest_sessions |
| 004 | cases |
| 005 | evidence, action_logs |
| 006 | escalations, swarm_events |
| 007 | jobs, consent, fees |
| 008 | rankings, audit |
| 009 | functions, triggers |
| 010 | RLS, views, seed |

---

## Review commands

```bash
rg "CREATE TABLE" supabase/migrations/
rg "case_status" supabase/migrations/
rg "REAL|FLOAT" supabase/migrations/
supabase db reset  # when local Supabase available
```

---

## Output

DB review for plan/review JSON:

- Enum diff report
- Table checklist 18/18
- RLS policy inventory
- Seed verification
- Blockers for REVIEWER

---

## Forbidden

- Invented columns not in BUILD_SPEC §5
- Skipping RLS on cases/evidence
- Mutable action_logs