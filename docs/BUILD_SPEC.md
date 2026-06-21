# LienLiberator — AI Build Spec v3.0 (Elite Multi-Role Approved)

**Status:** 12 specialist reviews merged — PM, MD, Users, Architect, DBA, API, Agents, FE, Security, QA, DevOps, SRE  
**Repo root:** `/Users/nirupamagr/2/lienliberator/`  
**Child specs:** `docs/BUILD_SPEC_AGENTS.md`, `docs/BUILD_SPEC_LOOPS.md`, `docs/BUILD_SPEC_API.md` (generate from §7)  
**Prototype reference only:** swarmfix localStorage demo — **do not ship**

---

## How AI Must Use This Document

1. **Source of truth order:** This file → `docs/BUILD_SPEC_AGENTS.md` → `supabase/migrations/*` → `package.json`
2. **Never invent:** RBI/NCRP APIs, auto-send email, civic map, Inngest, Edge Functions, `ESCALATION_L1` enums
3. **Every mutation:** Zod validate → rate limit → RLS → state machine guard → append `action_logs`
4. **Money:** `BIGINT` paise only — never float rupees
5. **States:** Only `case_status` enum in §4 — not speck diagram labels

---

## 0. Executive Summary

**Product:** Persistent India bank/UPI freeze case manager. User uploads evidence once; system classifies, reminds, drafts letters (copy-only), builds SHA-256 bundles, tracks escalation ladder L1→L3, contributes anonymized bank rankings.

**NOT:** Law firm, RBI, bank agent, AI lawyer, unfreeze guarantee.

**MVP:** SBI playbook + innocent-receiver/cyber-UPI + guest intake + Supabase persistence + human ops queue.

**Beta:** 50 cases, 12 weeks, Karnataka + Maharashtra.

**Success:** ≥30% verified release @90d, <3 human touches/case, LLM ≤₹800/case, contingency collection ≥70%.

---

## 1. Scope Lock

### IN (Phase 1–2)
Guest 30-sec intake, phone OTP auth, case dashboard, action inbox, SBI L1–L3 letter drafts, mark-sent + proof gates, evidence upload SHA-256, cron monitoring, human ops queue, disclaimers A–H, consent_records, fee_agreements (schema), internal leaderboard (n≥5 gate).

### OUT (explicit — do not build)
Civic/NammaKasa map, auto-file RBI/NCRP/CPGRAMS, WhatsApp bot, Playwright portal filing, NPCI, lawyer marketplace, all banks (SBI depth only), multilingual letters (EN letters; HI UI chrome Phase 3), OCR auto-advance (Phase 2).

---

## 2. Tech Stack (pinned)

See `lienliberator/package.json` — **copy exact versions**.

| Layer | Choice |
|-------|--------|
| Runtime | Node 22.x, pnpm 10.12.1 |
| Framework | Next.js **16.2.9**, React **19.2.7**, App Router |
| UI | Tailwind **4.x**, shadcn/ui (CLI 3.2.1), lucide-react |
| DB/Auth/Storage/Realtime | Supabase **ap-south-1** (Mumbai) |
| Queue | Postgres `agent_jobs` + Vercel cron drain — **not** Inngest |
| Cache/locks | Upstash Redis ap-south-1 |
| LLM | `@anthropic-ai/sdk` — model `claude-sonnet-4-20250514` |
| Memory | Supermemory Cloud prod; local dev only |
| Observability | Langfuse + Sentry |
| Payments | Razorpay (Phase 2) |
| Email | Resend (Phase 2) |
| Deploy | Vercel **bom1** + `vercel.json` |

### Architecture (single app — ADR-001)
All logic in Next.js `app/api/v1/*` + `lib/*`. No monorepo. No Supabase Edge Functions in MVP.

### Job flow (mandatory)
```
trigger → lib/agents/router.ts → INSERT agent_jobs → cron /internal/jobs/process
→ runner + Zod output → swarm_events + action_logs → Supabase Realtime
```

---

## 3. Folder Structure

```
lienliberator/
├── package.json, vercel.json, .env.example
├── middleware.ts
├── app/                    # routes per §9
├── components/             # CaseWizard, NextStepsCard, etc.
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── auth/guest.ts       # GUEST_JWT_SECRET
│   ├── state-machine/{transitions,guards,types}.ts
│   ├── agents/             # see BUILD_SPEC_AGENTS.md
│   ├── loops/              # see BUILD_SPEC_LOOPS.md
│   ├── jobs/{enqueue,process,idempotency}.ts
│   ├── validation/api-schemas.ts
│   ├── ratelimit.ts
│   ├── constants/disclaimers.ts
│   └── rankings/pressure-score.ts
├── supabase/migrations/001..010
├── tests/{e2e,unit,contract,integration}
└── docs/BUILD_SPEC*.md
```

---

## 4. State Machine (canonical)

### 4.1 Enum `case_status`
`new` | `intake_scoping` | `monitoring` | `evidence_building` | `escalation` | `awaiting_response` | `verified` | `retried` | `resolved` | `closed` | `human_escalation` | `public_pressure` | `stalled`

**Forbidden aliases:** `DRAFT`, `CLASSIFIED`, `ESCALATION_L1`, `USER_ACTION`

### 4.2 Transitions (server-enforced)

| From | Event | To | Guard |
|------|-------|-----|-------|
| new | evidence.submitted | intake_scoping | has_min_evidence |
| intake_scoping | intake.classified | monitoring | playbook assigned |
| monitoring | checklist.complete | evidence_building | checklist_complete |
| evidence_building | bundle.ready | escalation | bundle_sha256 |
| escalation | user.mark_sent | awaiting_response | proof + user_approved |
| awaiting_response | response.timeout | escalation | has_prior_level_proof, level<L4 |
| awaiting_response | user.confirm_unfreeze | verified | evidence or confirm |
| verified | resolution.confirmed | resolved | resolution_type set |
| resolved | user.opt_in_stats | public_pressure | consent public_stats |
| * | cost_cap / low_confidence | human_escalation | triggers |

Invalid → **422** `{ error: { code: "guard_failed", guard: "has_prior_level_proof" } }`

### 4.3 Escalation ladder

| Level | Channel | Wait | Proof |
|-------|---------|------|-------|
| L1 | branch_manager | 7d | — |
| L2 | nodal_officer | 10d | L1 send_proof |
| L3 | rbi_cms | 90d | L2 send_proof + user consent |
| L4 | rti | 30d | L3 send_proof |

### 4.4 Resolution types (fee + rankings)

Fee eligible: `full_unfreeze` | `partial_release` (≥50% frozen) | `lien_lifted_innocent_receiver`  
Excluded: `suspected_mule`, `court_order`, `tax_attachment`

### 4.5 pressure_score v1
```
LEAST(100, 0.30*min(median_days/180,1)*100 + 0.25*(1-innocent_receiver_rate)*100
  + 0.20*(open/reported)*100 + 0.15*(1-satisfaction/5)*100 + 0.10*(ombudsman_filings/reported)*100)
is_public = sample_size >= 5
```

---

## 5. Database

**Migrations:** `lienliberator/supabase/migrations/001_extensions_enums.sql` … `010_rls_views_seed.sql`

### 5.1 Tables (18)

`banks`, `playbooks`, `profiles`, `guest_sessions`, `cases`, `evidence`, `action_logs`, `escalations`, `swarm_events`, `user_actions`, `agent_jobs`, `consent_records`, `fee_agreements`, `human_gate_queue`, `bank_scores`, `bank_disputes`, `audit_seals`, `permissions`

### 5.2 Critical rules
- Money: `*_paise BIGINT`
- Guest: store `device_token_hash` only
- `action_logs`, `consent_records`, `swarm_events`: append-only (triggers deny UPDATE/DELETE)
- `cases.public_id`: `LL-XXXXXX` for URLs; UUID internal only
- Functions: `transition_case()`, `append_swarm_event()`, `compute_pressure_score()`, `refresh_bank_score_snapshot()`
- MV: `mv_bank_leaderboard` — refresh cron 2am IST

### 5.3 SBI seed
Bank slug `state-bank-of-india`, nodal `customer.care@sbi.co.in`  
Playbooks: `innocent_receiver_upi_chain_sbi`, `victim_upi_chain_sbi`, `innocent_receiver_upi_chain_generic`

### 5.4 Storage buckets
`evidence` (private, 25MB, jpeg/png/pdf), `bundles`, `letter-proofs`, `exports`  
Path: `{case_id}/{evidence_id}/{filename}`

---

## 6. API (`/api/v1`)

**Full contract:** see elite API review — implement `lib/validation/api-schemas.ts` + ErrorEnvelope on every route.

### 6.1 Error envelope (always)
```json
{ "error": { "code": "guard_failed", "message": "...", "guard": "has_prior_level_proof", "request_id": "req_...", "doc_url": "..." } }
```

### 6.2 Routes

| Method | Path | Auth |
|--------|------|------|
| POST | /guest/sessions | none |
| POST | /cases | JWT or X-Guest-Token |
| GET | /cases, /cases/{public_id} | owner/guest |
| PATCH | /cases/{id}/intake | owner/guest |
| POST | /cases/{id}/claim | JWT + guest token |
| POST | /cases/{id}/evidence/upload-url | owner |
| POST | /cases/{id}/evidence/{eid}/confirm | owner |
| POST | /cases/{id}/transitions | owner — **only way to change status** |
| POST | /cases/{id}/escalations/{eid}/approve | owner |
| POST | /cases/{id}/escalations/{eid}/mark-sent | owner + proof_evidence_id |
| POST | /cases/{id}/evidence/bundle | owner |
| DELETE | /cases/{id} | owner (30d erasure SLA) |
| GET | /banks/rankings | public |
| GET | /ops/queue | operator |
| POST | /internal/cron/{tick,reminders,rankings} | CRON_SECRET |
| POST | /internal/jobs/{enqueue,process} | CRON_SECRET |

### 6.3 Idempotency
Header `Idempotency-Key: uuid` required on POST /cases, transitions, mark-sent. Redis TTL 24h.

### 6.4 Rate limits (Upstash)
Guest case create: 5/day; auth: 10/day; global IP: 300/min; transitions: 20/hour/case.

---

## 7. Guest Auth (ADR-003)

```
POST /guest/sessions → { device_token, guest_session_id, expires_at }
device_token = JWT(GUEST_JWT_SECRET, { sub: guest_session_id, typ: 'guest', exp: 90d })
Cookie: ll_guest (httpOnly, SameSite=Lax)
Header: X-Guest-Token on API calls
POST /cases/:id/claim merges guest → user_id
```

**Not** Supabase anonymous auth. **Not** localStorage.

---

## 8. Agents

**Normative child doc:** `lienliberator/docs/BUILD_SPEC_AGENTS.md`

Summary:
- 8 roles; Zod parse all outputs; template fallback on failure
- Forbidden tools: `send_email`, `file_rbi`, `file_ncrp`, `mark_escalation_sent`
- Redact PII before LLM; cross-border consent required
- Cost cap $2/case → `human_escalation`
- 20 golden eval cases in CI

---

## 9. Frontend

### 9.1 Routes
`/`, `/guest/report`, `/auth`, `/onboarding`, `/cases`, `/cases/new`, `/cases/[id]`, `/cases/[id]/letters/[level]`, `/leaderboard`, `/leaderboard/[bankSlug]`, `/leaderboard/methodology`, `/ops/queue`, `/legal/disclaimer`, `/legal/privacy`

### 9.2 UX rules (user research)
- **Primary widget:** `NextStepsCard` ("today's action") — not swarm log
- Swarm log behind "Details" tab
- Guest intake <30s; phone OTP after value
- Fee copy: "₹0 until money back" + rupee calculator
- Mobile: bottom nav, camera capture, 44px targets

### 9.3 Design tokens
Navy `#0B1F33`, primary `#1F6B8A`, saffron `#E67E00` accent  
Fonts: DM Sans, IBM Plex Sans, IBM Plex Mono  
Money: `MoneyDisplay` en-IN grouping

### 9.4 Realtime channels
`swarm_events`, `user_actions`, `cases` on `/cases/[id]`; poll 30s fallback

---

## 10. Legal & Compliance

### 10.1 Disclaimer blocks A–H
Store verbatim in `lib/constants/disclaimers.ts`:

- **A** Footer: not law firm / not RBI / helpline 1930
- **B** Intake modal: no guarantee; user responsible; required checkbox
- **C** Letter: DRAFT ONLY
- **D** Fee: success fee only after verified release; never unfreeze fees
- **E** Leaderboard: user-reported, not RBI data
- **F** AI: may process outside India with consent
- **G** Evidence: don't upload passwords; own docs only
- **H** Human ops may review edge cases

### 10.2 Consent (`consent_records` — append-only)
terms_privacy, case_data_processing, evidence_upload, ai_processing, cross_border_ai, escalation_send, public_stats (default OFF), whatsapp_sms

### 10.3 Data classes
T2 financial: case active + 3y post-close | T3 govt IDs: minimal, masked | T5 audit: 8y  
Never full Aadhaar. Never net-banking creds.

---

## 11. Pricing

| Tier | Price | Unlocks |
|------|-------|---------|
| Stabilize | ₹0 | L1 draft, checklist, email reminders |
| Escalate | ₹999 | L2, bundle, 30d swarm |
| RBI Pass | ₹1,499 | L3 draft, 90d tracking |
| Success | 3% (cap ₹25k, min ₹2k) | Opt-in; invoice only after verified release |

**Fee does NOT unlock escalation proof gates** — only features.

---

## 12. Notifications

Day 0–7: max 1/day | 8–30: 2/week | 31–90: 1/week + statutory  
Quiet hours: 10pm–8am IST  
Always send: user_action_required, escalation unlocked, statutory deadlines

---

## 13. Implementation Phases

### Phase 1 (weeks 1–6) — slices in order
1. Migrations + RLS + SBI seed  
2. Guest session + case CRUD  
3. Evidence upload + SHA-256  
4. State machine API + action_logs  
5. Intake classifier (rules + LLM)  
6. NextStepsCard + user_actions  
7. Drafter L1–L3 copy-only  
8. Escalation proof gates  
9. Cron tick + reminders  
10. Disclaimers + consent  
11. Human ops queue  

**Exit:** guest intake → auth merge → L1 letter → mark-sent → audit log

### Phase 2 (weeks 7–10)
Verifier OCR, PDF bundle, rankings cron, Razorpay, ops dashboard, SEO pages

### Phase 3 (weeks 11–12)
Public leaderboard, Hindi UI chrome, share cards

---

## 14. Testing (mandatory before merge)

| Layer | Tool | Gate |
|-------|------|------|
| Unit | Vitest | 50 state guard tests, 100% branch on guards |
| Contract | Vitest + Zod | All 23 API routes |
| RLS | Vitest + supabase local | 20-row security matrix |
| E2E smoke | Playwright @smoke | 8 scenarios on every PR |
| Agent golden | Vitest + MSW | 18/20 pass |
| CI grep | `scripts/verify-no-auto-send.sh` | 0 auto-send |

**E2E files:** `tests/e2e/guest-intake.spec.ts`, `escalation-gates.spec.ts`, `mark-sent.spec.ts`, etc. (30 total)

**India regression:** `tests/regression/india-edge-cases/` — innocent receiver, 19mo stall, mule, forged screenshot

---

## 15. DevOps

- **Region:** Vercel bom1 + Supabase ap-south-1  
- **Crons:** tick */15, reminders 09:00 IST, rankings 02:00 IST, jobs/process */5  
- **Cron auth:** `Authorization: Bearer ${CRON_SECRET}` + Redis lock  
- **Alerts:** cron fail 2x → P1; cost/case >$1.50 → P2; leaderboard n<5 leak → P1 auto-hide  
- **Leaderboard takedown:** `LEADERBOARD_PUBLIC_ENABLED=false` + SQL `is_public=false`  
- **PITR:** Supabase Pro, 14-day recommended

---

## 16. Hallucination Trap List (25 — CI + review)

| # | Wrong | Right |
|---|-------|-------|
| 1 | ESCALATION_L1 status | `escalation` + level L1 |
| 2 | Auto-send email | mark-sent + proof only |
| 3 | RBI CMS API | Draft + user files manually |
| 4 | NCRP polling API | User manual status |
| 5 | localStorage cases | Supabase |
| 6 | Inngest queue | agent_jobs + cron |
| 7 | Edge Functions for guards | lib/state-machine |
| 8 | Float rupees | paise BIGINT |
| 9 | Skip L2 UI-only | Server 422 guard_failed |
| 10 | Leaderboard n=1 | is_public false until n≥5 |
| 11 | Fee on letter_sent | Fee on resolution only |
| 12 | Civic map routes | Out of scope |
| 13 | Supermemory on Vercel local | Cloud API |
| 14 | Service role in browser | server admin.ts only |
| 15 | UPDATE action_logs | Append-only trigger |
| 16 | Full Aadhaar column | last-4 only |
| 17 | PII in Langfuse tags | case_id only |
| 18 | api/cases not api/v1/cases | Versioned path |
| 19 | params.id without await | Next 15+ async params |
| 20 | Invented LienLiberator_State_Machine.md | This BUILD_SPEC |
| 21 | OCR Phase 1 required | Phase 2; human verify v1 |
| 22 | Playwright filing Phase 1 | Phase 4+ legal sign-off |
| 23 | Supabase anon guest | Custom guest JWT |
| 24 | Realtime on action_logs | swarm_events + user_actions |
| 25 | Payment unlocks L2 proof | Tier unlocks features only |

---

## 17. Environment Variables

See `lienliberator/.env.example` — 25+ vars. Never `NEXT_PUBLIC_*` for secrets.

---

## 18. Sign-Off Checklists

### Product
- [ ] Lien-only; civic deferred  
- [ ] 15 E2E pass  
- [ ] Pricing + fee_agreements wired  

### Security
- [ ] Blocks A–H live  
- [ ] consent_records all steps  
- [ ] Leaderboard opt-in default OFF  
- [ ] Incident runbook documented  

### Engineering
- [ ] RLS pen-test 20/20  
- [ ] verify-no-auto-send.sh passes  
- [ ] Guest→claim E2E  
- [ ] Realtime <2s  
- [ ] Migrations 001–010 applied  

### Ops
- [ ] Crons running on staging manual test  
- [ ] Leaderboard kill switch tested  
- [ ] 50-case beta protocol ready  

---

## 19. Kill Criteria (month 6)

Release rate <15%, collection <50%, negative margin, defamation notice, RBI warning, LLM >₹1500/case, NPS <20 → stop or pivot B2B CA white-label.

---

## 20. AI Implementer Command

```
Implement LienLiberator Phase 1 from BUILD_SPEC.md v3.
Work in lienliberator/. Follow slice order §13.
Use package.json versions exactly. Run migrations 001–010 before any UI.
All status changes via POST /transitions only.
Read docs/BUILD_SPEC_AGENTS.md before writing any agent code.
Run scripts/verify-no-auto-send.sh before claiming done.
```

---

## 21. Review Panel Signatures

| Role | Verdict |
|------|---------|
| PM | Approved — lien-only, pricing locked |
| MD | Invest — billing schema, 12-week beta |
| Users (3) | Approved — action inbox, ₹0 until recovery, Hindi chrome P3 |
| Architect | Approved — single app, pinned deps, job processor |
| DBA | Approved — 18 tables, functions, RLS, MV |
| API Designer | Approved — ErrorEnvelope, idempotency, OpenAPI shapes |
| Agent Engineer | Approved — Zod + golden eval + template fallback |
| Senior FE | Approved — routes, components, design tokens |
| Security | Shippable with guardrails — Blocks A–H, consent, k-anonymity |
| QA | Approved — 30 E2E, 50 guards, CI YAML |
| DevOps/SRE | Approved — vercel.json, Mumbai regions, runbooks |

**This spec is approved for autonomous AI implementation of Phase 1 beta.**