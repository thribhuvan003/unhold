# Anti-Hallucination Guide

**Enforced by:** RESEARCHER, REVIEWER, SECURITY_AUDITOR, `pnpm verify:no-auto-send`  
**Parent list:** BUILD_SPEC.md §16 (25 traps)

---

## 1. The 25 traps (expanded)

| # | Wrong (hallucination) | Right (canonical) | Verify |
|---|----------------------|-------------------|--------|
| 1 | Status `ESCALATION_L1` | `case.status = escalation` + `escalation_level = L1` | `rg ESCALATION_L1` |
| 2 | Auto-send email to bank | User copies letter; `mark-sent` + proof | `verify-no-auto-send` |
| 3 | RBI CMS API integration | Draft only; user files manually | no `file_rbi` |
| 4 | NCRP status polling API | User checks portal manually | no `file_ncrp` |
| 5 | localStorage case persistence | Supabase `cases` table | `rg localStorage` |
| 6 | Inngest job queue | `agent_jobs` + cron `/jobs/process` | `rg inngest` |
| 7 | Edge Functions for guards | `lib/state-machine/guards.ts` | no edge guard routes |
| 8 | Float rupees `amount DECIMAL` | `*_paise BIGINT` | `rg FLOAT\|REAL` migrations |
| 9 | L2 skip in UI only | Server 422 `guard_failed` | proof-gates tests |
| 10 | Leaderboard public at n=1 | `is_public` false until n≥5 | rankings logic |
| 11 | Fee on letter sent | Fee on `resolution_type` confirm | fee_agreements |
| 12 | Civic/NammaKasa map | Out of scope Phase 1 | no map routes |
| 13 | Supermemory on Vercel local | Cloud Supermemory API | env vars |
| 14 | Service role in browser | `lib/supabase/admin.ts` server only | `rg SERVICE_ROLE` client |
| 15 | UPDATE action_logs | Append-only trigger | migration triggers |
| 16 | Full Aadhaar in DB/prompts | `id_aadhaar_last4` evidence type only | PII grep |
| 17 | PII in Langfuse tags | `case_id` only | observability config |
| 18 | `/api/cases` unversioned | `/api/v1/cases` | route paths |
| 19 | `params.id` sync | `const { id } = await params` | Next 15+ routes |
| 20 | Old State_Machine.md doc | `BUILD_SPEC.md` §4 only | doc source order |
| 21 | OCR required Phase 1 | Phase 2; human verify v1 | slice-03 scope |
| 22 | Playwright auto-file Phase 1 | Phase 4+ legal sign-off | e2e scope |
| 23 | Supabase anonymous guest | Custom `GUEST_JWT_SECRET` JWT | `lib/auth/guest.ts` |
| 24 | Realtime on action_logs | `swarm_events` + `user_actions` | subscriptions |
| 25 | Payment skips L2 proof | Tier unlocks features only | proof-gates |

---

## 2. Agent-specific traps

### INTAKE
- Invented NCRP ID → must cite evidence manifest
- `playbook_slug` not in seed → refuse + human_gate

### DRAFTER
- Wrong disclaimer text → exact `DRAFT ONLY — REVIEW BEFORE USE`
- Invented nodal email → `get_bank_contacts` or SBI seed

### MONITOR
- `suggest_status_transition` not null → **forbidden**
- Auto email reminder → user_actions only

### VERIFIER (product)
- Float amount from OCR → integer paise only

### Harness agents
- Confusing harness VERIFIER with product VERIFIER
- IMPLEMENTER self-approving without REVIEWER JSON

---

## 3. Pre-code checklist (IMPLEMENTER)

Before handoff to REVIEWER:

```bash
pnpm verify:no-auto-send
pnpm typecheck
# slice-specific tests per plan.md
```

Mental check:

- [ ] Every new enum value exists in migration or BUILD_SPEC §4.1
- [ ] Every new route under `/api/v1/`
- [ ] Every status change via transitions module
- [ ] Every agent output has Zod schema
- [ ] No new npm package without plan ADR

---

## 4. Pre-merge checklist (REVIEWER + specialists)

- [ ] `review-checklist.md` sections for slice number
- [ ] SECURITY_AUDITOR findings merged (blockers only)
- [ ] QA_ENGINEER test mapping complete
- [ ] All 25 traps scanned on diff
- [ ] `acceptance_criteria` from orchestration — each has evidence

---

## 5. Specialist audit commands

```bash
# Full trap scan
bash scripts/verify-no-auto-send.sh

# Money columns
rg -n "REAL|FLOAT|DOUBLE" supabase/migrations/ || true

# Legacy status strings
rg -n "ESCALATION_L1|INTAKE_COMPLETE|CLASSIFIED" --glob '!docs/*'

# Secrets in client
rg -n "NEXT_PUBLIC.*(SECRET|SERVICE_ROLE|CRON)" .

# Unguarded status updates
rg -n "\.update\(.*status" app/ lib/ --glob '!*transitions*'
```

---

## 6. When hallucination is suspected

1. **Stop implementation**
2. RESEARCHER re-reads spec section
3. If wrong code exists → IMPLEMENTER fix loop
4. If spec wrong → ADR + human_gate (do not patch spec silently)
5. Log in `MANIFEST.memory.spec_gaps`

---

## 7. Confidence levels for research

| Level | Meaning | Action |
|-------|---------|--------|
| HIGH | Direct quote from BUILD_SPEC or migration | Use in plan |
| MEDIUM | Inferred from related section | Flag in plan; REVIEWER checks |
| LOW | Assumption | **Do not use** — SPEC_SILENT |

---

## 8. CI alignment

These traps are designed to match:

- `scripts/verify-no-auto-send.sh`
- `scripts/harness/review-checklist.md` §12
- `CLAUDE.md` §5 Forbidden Patterns

If script passes but REVIEWER finds trap violation → **script gap** → file issue in plan for DEVOPS.

---

**Research protocol:** `docs/RESEARCH_PROTOCOL.md`  
**Team enforcement:** `prompts/team/SECURITY_AUDITOR.md`, `prompts/team/RESEARCHER.md`