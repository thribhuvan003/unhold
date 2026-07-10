# LienLiberator — REVIEWER Checklist

**Use with:** `prompts/agents/REVIEWER.md`  
**Output:** `.claude/session/{slice_id}/review-round-{n}.json`  
**Rule:** Only `blocker` and `major` issues count toward `issue_count`. `minor` and `nit` are informational.

---

## 0. Review Inputs (Required)

- [ ] `MANIFEST.json` → `active_slice` matches diff scope
- [ ] `.claude/session/{slice}/plan.md` exists
- [ ] `config/harness/slice-orchestration.json` slice `scope_files` loaded
- [ ] Git diff reviewed file-by-file
- [ ] BUILD_SPEC sections in slice `spec_refs` re-read

---

## 1. Scope Compliance

- [ ] Every changed file is in `scope_files` OR explicitly justified in plan.md
- [ ] No files from `forbidden_in_slice` touched
- [ ] No future slice features implemented
- [ ] No drive-by refactors (rename unrelated, format unrelated)
- [ ] No new dependencies without PLANNER ADR note in plan.md

**Blocker if:** out-of-scope production code without plan justification.

---

## 2. Forbidden Patterns (BUILD_SPEC §16 + CLAUDE.md §5)

Run mentally or verify author ran `pnpm verify:no-auto-send`.

| Check | Blocker? |
|-------|----------|
| `send_email`, `file_rbi`, `file_ncrp`, `auto_send` | Yes |
| `ESCALATION_L1`, `DRAFT`, `CLASSIFIED` status strings | Yes |
| Inngest, Edge Functions for guards | Yes |
| localStorage for case persistence | Yes |
| Float / REAL money columns | Yes |
| `NEXT_PUBLIC_*` secrets | Yes |
| Service role in client components | Yes |
| Direct case.status mutation bypassing transitions API | Yes |
| `UPDATE`/`DELETE` on action_logs, consent_records, swarm_events | Yes |
| Full Aadhaar/PAN/account in code or prompts | Yes |
| Invented RBI/NCRP/CMS API endpoints | Yes |
| Auto-send via Resend | Yes |

---

## 3. Database / Migrations (slices 01+)

- [ ] `case_status` enum = exactly 13 values from BUILD_SPEC §4.1
- [ ] 18 tables present per §5.1 (slice-01)
- [ ] `*_paise BIGINT` for money
- [ ] RLS enabled on user data tables
- [ ] Append-only triggers on audit tables
- [ ] SBI seed: `state-bank-of-india`, `customer.care@sbi.co.in`
- [ ] Playbook slugs match spec

---

## 4. API Contract (slices 02+)

- [ ] Routes under `/api/v1/` only
- [ ] Error envelope `{ error: { code, message, guard?, request_id } }`
- [ ] `Idempotency-Key` on POST mutations per §6.3
- [ ] Rate limits applied per §6.4
- [ ] Guest auth via `GUEST_JWT_SECRET` JWT — not Supabase anon
- [ ] Next.js 15+ async `params` awaited in route handlers

---

## 5. State Machine (slices 04+)

- [ ] All status changes via `POST /transitions` only
- [ ] Guards return 422 `guard_failed` with guard name
- [ ] Transition table matches BUILD_SPEC §4.2
- [ ] Every transition appends `action_logs`
- [ ] Unit tests cover guard branches (target 50+ cumulative)

---

## 6. Agents (slices 05, 07, 09)

- [ ] Outputs pass Zod schemas in `lib/agents/schemas.ts`
- [ ] `FORBIDDEN_TOOL_NAMES` not used
- [ ] Citations reference valid source_ids
- [ ] `disclaimer_block` exact match on LetterDraftOutput
- [ ] Template fallback path exists for DRAFTER
- [ ] MONITOR does not call draft/send tools
- [ ] human_gate flags set per BUILD_SPEC_AGENTS thresholds
- [ ] No PII in prompts (last-4 only)

---

## 7. Escalation (slices 07–08)

- [ ] L2 requires L1 proof; L3 requires L2 proof + consent
- [ ] mark-sent requires `proof_evidence_id`
- [ ] No `skip_escalation_level`
- [ ] Copy-only letters — user approval before export

---

## 8. Frontend (slices 02, 06+)

- [ ] `NextStepsCard` primary on case detail (slice 06+)
- [ ] Swarm log not primary widget
- [ ] Disclaimer blocks A–H where required (slice 10+)
- [ ] Design tokens: Navy `#0B1F33`, primary `#1F6B8A`
- [ ] Mobile 44px touch targets
- [ ] `MoneyDisplay` en-IN for rupees

---

## 9. Cron / Jobs (slices 05, 09)

- [ ] `agent_jobs` + `/internal/jobs/process` — not Inngest
- [ ] Cron routes use `CRON_SECRET` + Redis lock
- [ ] Idempotent job keys
- [ ] vercel.json cron schedule matches BUILD_SPEC §15

---

## 10. Tests

- [ ] Tests added per plan.md test section
- [ ] New guards have unit tests
- [ ] New API routes have contract tests
- [ ] Agent changes have golden/schema tests where applicable
- [ ] Tests do not mock away security guards

**Major if:** slice acceptance criterion has zero test coverage.

---

## 11. Security & Compliance

- [ ] consent_records append-only (slice 10+)
- [ ] cross_border_ai consent before LLM (slice 10+)
- [ ] public_stats default OFF
- [ ] Evidence upload size/type limits enforced
- [ ] Operator routes require operator auth (slice 11)

---

## 12. Hallucination-Specific Review

| # | Trap | Look for |
|---|------|----------|
| 1 | ESCALATION_L1 status | level in escalations table, status=escalation |
| 2 | Auto-send | any email send in agent path |
| 3 | RBI CMS API | fetch to cms.rbi.org.in from server |
| 5 | localStorage cases | localStorage.setItem case data |
| 6 | Inngest | inngest import |
| 8 | Float rupees | parseFloat amount |
| 18 | Unversioned API | /api/cases without v1 |
| 23 | Supabase anon guest | signInAnonymously for guest |

---

## 13. Issue Severity Guide

| Severity | Definition | Counts? |
|----------|------------|---------|
| blocker | Breaks spec, security, or verification gates | Yes |
| major | Missing acceptance criterion or test | Yes |
| minor | Style, naming, non-spec refactor | No |
| nit | Formatting, comment typos | No |

---

## 14. Review Output Template

```json
{
  "slice_id": "slice-XX",
  "round": 1,
  "reviewer": "REVIEWER",
  "issue_count": 0,
  "issues": [],
  "passed_checklist_sections": [
    "scope",
    "forbidden-patterns",
    "api",
    "tests"
  ],
  "approved": true,
  "notes": "Ready for VERIFIER"
}
```

**approved** = `issue_count === 0` only.

---

## 15. Abbreviated Review (verify-fix loop)

When `fix_round > 0` after VERIFIER failure:

- [ ] Re-check only failed gates + files changed since last review
- [ ] Re-check any prior blocker/major (must stay fixed)
- [ ] Skip nit/minor unless in touched files

---

## 16. Sign-Off

Reviewer MUST NOT sign off if:

- `pnpm verify:no-auto-send` would fail
- Any blocker unchecked
- plan.md task unchecked without explanation
- Diff touches `forbidden_in_slice`

Next step after sign-off: `bash scripts/harness/run-slice.sh --verify-only`