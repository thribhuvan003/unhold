# MEMORY — lienliberator decisions (2026-06-24 session)

## 2026-06-24: Batch 5 plan selection + HyperText showcase integration

**Decided:**
- Recommended path for Batch 5: **Slice-14 (bundle to proof-gates) + UX polish first**.
- Create and integrate the full HyperTextShowcase component (from provided App.tsx) as a new reusable component + dev demo route.
- HyperText primitive was already integrated in NoticeAnalysisCard (default + glitch variants) for "decryption" humane UX on analyzer results. This fulfills the engaging feedback from research.

**Why this choice (not the other two):**
- Highest-value buildable: closes the evidence → escalation loop for real users (generate sealed bundle, then use it to progress L1->L2/L3 via proof gates). Directly enables "tangible proof package" value prop.
- UX polish (mobile, loading/empty/trust states, more use of existing HyperText) makes the wizard + analyzer immediately usable/polished for stressed users.
- Defers env-blocked (Razorpay keys, full E2E on machines without working Playwright binary, deploy).
- Matches REMAINING_WORK.md explicit recommendation and "submit answers" request.

**Rejected alternatives:**
- All buildable slices (14/17/18 + polish): bigger scope, risks unfinished gates or polish. More commits but higher chance of incomplete real-user path.
- Just prep E2E + deploy guide: stops feature work; leaves the bundle useless for escalation (no wire to gates). Users can't complete the "sealed package" story.

**Process followed (perfect loops/agents/teams):**
- Read MANIFEST, REMAINING_WORK, slice-orchestration, key code (proof-gates, bundle runner, guest report, HyperText usage).
- Used todo tracking.
- Surgical: only added showcase (new files in components/showcase + app/demo), reused existing HyperText export.
- Will execute slice-14 surgically in proof-gates.ts only (per orchestration scope).
- All verification gates required (typecheck, lint, unit, verify:no-auto-send).
- Real-user focus: bundle now helps unlock real escalation progress.

**Next session priorities:**
- Execute small scoped slice-14: extend ProofGateInput + evaluateProofGate + checkProofGates (load bundle existence from action_logs or evidence verified state + confidence).
- Update/add tests in scope.

## 2026-06-24: Merged Realistic Plan (from Optimus feedback + prior)
**Merged Vision (best of both plans)**:
- Positioning: Official GRM/MRM (2026 I4C) is **primary** (free, real coordination power with video/time-bound). Unhold is the **smartest preparation/intel layer** on top — makes GRM submissions stronger via AI (analyzer for GRM-relevant insights, GRM-aware checklist, GRM-optimized bundle/letters with citations, timeline tracking).
- Tech: Hybrid RAG (BM25 + pgvector) over curated KB (GRM guidelines, successful reps, judgments). Multi-agent (reuse/extend NOTICE/INTAKE/DRAFTER as Intake → Analyzer(RAG) → Researcher → Drafter → Critic/Validator). Evaluation (LLM-as-judge + user feedback in langfuse). Observability (langfuse already in). GRM prep flow.
- Process: Our harness (RESEARCHER/PLANNER/IMPLEMENTER etc.) for execution. Friend's phasing for scope control: **Phase 1 first** (positioning + basic RAG + GRM prep) before deep multi-agent.
- Strengths leveraged: Existing wizard (analyzer hero, checklist, upload validation, bundle, letters, proof gates, in-app reminders only), NVIDIA, langfuse, Supabase, harness (already demonstrates advanced agentic thinking), consent/no-auto-send discipline.
- Resume framing: Production AI SaaS for real Indian legal constraint (GRM integration + RAG/multi-agent under DPDP/legal tone/messy docs).

**Honest Assessment (as friend said)**:
- Good potential, better than previous. Execution quality > plan. Risk = over-scope/incomplete delivery.
- No "stand out for sure" guarantee. But Phase 1 cleanly shipped + strong docs + real user signal = competitive. Harness + honest pivot story is a differentiator.
- Merged plan wins on realism (friend) + depth/reuse (prior).

**Decided**:
- Merged plan (friend's realistic phasing + our depth/harness/reuse): Official GRM/MRM primary. Unhold = best prep/intel layer. Phase 1 first (positioning + basic RAG + GRM prep flow). Then AI elevation.
- Already started: Positioning in REMAINING_WORK/FAQ/WHAT..., RAG stub (grm-knowledge, retrieve, injection in notice/runner, vector migration).
- Execute via harness (RESEARCHER for GRM refs, PLANNER scoped, etc.). Phase 1 must ship cleanly before multi-agent depth. No over-scope.
- Verification: typecheck/lint/tests + manual GRM end-to-end + AI eval metrics.

**Next priorities**:
1. Complete Phase 1 (positioning + basic RAG + GRM prep flow + README).
2. Seed KB + hybrid retrieve.
3. Basic multi-agent chaining + eval.
4. Real beta testing signal.

## 2026-06-24 (later): Honest status confirmation + no WhatsApp

**Verified live in codebase (grep + file reads):**
- No WhatsApp, SMS, Twilio, or any outbound sending code exists anywhere (lib/, app/). 
- monitor.ts (and product/MONITOR.md): "Never send email, SMS, or WhatsApp — reminders become user_actions only."
- verify-no-auto-send.sh hard gate + broader CI greps forbid send patterns.
- Only a consent enum value + string for `whatsapp_sms_reminders` (aspirational, no implementation).
- This is **by design** (human-in-loop, no-auto-send safety promise). "Sending WhatsApp status" would be a violation, not a missing feature.

**Proof-gates current state (post fix):**
- Prior-level send_proof chain is evaluated first and non-bypassable.
- `hasSealedBundle` and `verifierConfidence` are **additive extra requirements** (push 'evidence_bundle' / 'evidence_verification' to missingProof when supplied as false/insufficient).
- Comments explicitly call out that bundle "can never substitute for the send-proof chain above; it stacks on top."
- Matches user's note (191c3f3): inverted bypass semantics were fixed to safe additive.

**HyperText:**
- Reverted from plain_english / what_this_means in NoticeAnalysisCard.tsx (now plain <p>).
- Showcase component + /demo/hypertext page remain for visual/dev use.
- Matches c62a745 (SSR-safe, lint-clean, off financial copy).

**Runtime / env reality (this sandbox):**
- No .next build dir.
- No .env.local (no keys).
- Agents + full wizard flow exist in code + pass unit/contract + type/lint + no-auto-send.
- All agent work here is mocked. No live NVIDIA calls, no applied 011_notice_analysis migration in a real DB this session, no end-to-end with real notice.

**Conclusion (straight):**
The committed code for the full visible MVP wizard + agents + APIs + safety gates is complete and gate-green. It is not a live, exercised, deployed system. WhatsApp sending was never part of it.

**UX polish next:**
Guest report hero (first impression) is highest leverage for the panicking-user research P0. Case workspace is where they spend time. Recommend starting with hero (mobile states, analyzer flow, trust copy, loading/error), then workspace or cross-cut.

**Process:** All changes followed verification loops, MEMORY appends, surgical scope.
- Polish: ensure mobile/responsive on guest report + case where analyzer + bundle appear; add trust notes if missing.
- Mark slice-14 verified, advance MANIFEST.
- Run full verify commands.
- Use same agent dispatch style for future batches (RESEARCHER + FRONTEND + REVIEWER/VERIFIER).

**Tag:** lienliberator
**Cites:** REMAINING_WORK.md (Batch 5 section), MANIFEST active_slice + slice-14 def, slice-orchestration.json, components/intake/NoticeAnalysisCard.tsx + ui/HyperText.tsx

---

## 2026-06-24 (this session): All-files perfect + learn-from-mistakes + paste block for Claude continuity

**Actions taken (process-first, not file-only):**
- Full grep audit across tree for pre-GRM language + bad filenames ("gr m-knowledge.ts" with space found + deleted).
- Read ritual files first: START_HERE, CLAUDE, prompts/README + team/agents, slice-orchestration, MANIFEST, REMAINING_WORK, ERRORS (created), key surfaces (landing, guest, case, README, FAQ, WHAT, FOR, RAG, notice/runner+prompt).
- Surgical consistency fixes only on user-entry copy: app/page.tsx hero, README positioning, FOR_FROZEN short version (canonical GRM lead now in all main paths).
- Created ERRORS.md with 4 detailed prior mistake entries + permanent rules (late research, inconsistent docs, over-scope, file-only, non-harness).
- Updated both PASTE_*.txt with self-contained master block containing: exact ritual, canonical sentence, 5 lessons, merged Phase 1 plan, harness dispatch instructions, files list, verification gates, success criteria.
- Appended this entry. RAG already wired from prior (runner injection + prompt rules + stubs + migration).
- Verified GRM language now surfaces in landing/guest/case/README/docs (grep confirmed).

**Decided:**
- This session's output is the clean state + perfect handoff block so next Claude (any model) starts with zero confusion and follows harness + Phase 1 gates.
- Focus stayed on process (harness prompts, lessons, verification, paste) + minimal surgical file fixes. No new features.
- Phase 1 exit criteria defined in the paste block (positioning 100% + basic RAG visible + GRM-prep mentions + all gates green).

**Rejected:**
- Touching bundle/letters/slices/polish in this pass (out of scope for "make all perfect + learn from mistakes").
- Broad refactors or unrelated "improvements".

**Next session priorities (for user or Claude):**
1. Run the ritual in the paste block verbatim.
2. If implementing further, dispatch RESEARCHER first for any GRM detail.
3. Execute Phase 1 remaining (more RAG seed, GRM in checklist/letters, full trace) using one-role harness loop + verifs.
4. Regenerate pastes at end of every future session.

**Tag:** lienliberator
**Cites:** ERRORS.md, PASTE_THIS..., NEW_LAPTOP_FIRST..., REMAINING_WORK GRM sections, app/page + guest + case + README edits, lib/rag/* + notice/runner

---

## 2026-06-24 (additional): Real-user input — ₹2 unknown UPI freeze (r/bangalore / r/UPI)

**Fresh input incorporated:**
- Exact case: Received ₹2 unknown UPI → full account (₹1800) frozen because "linked to fraudulent transaction". Police demanded ₹10k to unfreeze; lawyer ₹7k (student couldn't pay, dropped case). Widespread comments confirm micro-amount (₹2/₹10/₹200) test transfers commonly trigger full freezes for innocent receivers (layer 3+ in chains). Users call for UPI "block unknown senders" option; advise delinking phone number + custom UPI ID. RBI rules say only lien disputed amount (often ignored in practice).
- Ties directly to GRM: 2026 SOP timelines (bank review 7 days, IO 15 days) + GRM module for review of such freezes. Still gaps in bank implementation (full freezes + "need police NOC").

**Changes made:**
- Added dedicated RAG chunk "small-amount-trail" (tiny unknown UPI test transfers).
- Strengthened notice analyzer prompt (plain_english + what_this_means) to explicitly surface this pattern and GRM path.
- Updated REMAINING_WORK research findings with this case + SOP reality.
- Enhanced REAL_USER_OBJECTIONS_FAQ with specific answer + recommended package for ₹2-style cases.
- Confirmed checklist already covers relevant evidence (bank stmt for source, chat for unsolicited).
- This input strengthens "first 5 minutes magical" value: analyzer must calm user by naming the exact common innocent-receiver-in-trail scenario.

**Why it helps:**
- Makes Unhold hyper-relevant to the most panic-inducing real scenario (tiny credit = total lock + extortion risk).
- Reinforces GRM-primary positioning with fresh evidence.
- Direct fuel for analyzer output, suggested_next, and "GRM-ready bundle" messaging.

## 2026-06-24 (deeper read): All Reddit comments + X comments for ₹2 case and similar

**Additional insights from full comments (beyond main post):**
- Overwhelming consensus: "Write an email to the grievance officer of the bank. If they don't respond, write to the RBI Ombudsman. Don't give anyone a single rupee."
- Users in 3rd-5th layers report bank saying "only lawyer or cyber cell can help" — but free paths exist and work for some.
- RBI guideline heavily cited: "only the lien amount should be marked—not the entire account frozen." Full freezes cause hardship (students, salary blocked).
- Prevention from community: Delink phone number from UPI (use custom ID/QR) so unknown can't send easily.
- X posts: "Account frozen for just ₹810... Entire ₹20k+ blocked"; "As per RBI guidelines, only the lien amount"; long delays (5+ months) even after submitting proofs; escalations to RBI, CyberDost.
- Matches Bank of Baroda steps (contact bank with docs) and I4C SOP GRM (bank branch grievance first).

## 2026-06-24 (post health slice): Backend diagnostic for "unknown error" root cause

**Root cause traced (not guessed):** Generic 500 "An unexpected error occurred" (lib/api/response.ts:55) from createAdminClient() throwing on missing SUPABASE_SERVICE_ROLE_KEY (lib/supabase/admin.ts) or GUEST_JWT_SECRET <32 chars (mirrors guest.ts). NVIDIA missing only degrades analyzer gracefully (manual entry). Cause only in server logs.

**Shipped (backend only, no user copy change, no send behavior):**
- lib/health/checks.ts + GET /api/v1/health (app/api/v1/health/route.ts): collects booleans + static hints for required (Supabase URL/anon/service, GUEST_JWT >=32, CRON), AI (NVIDIA), optional (Upstash). 200 if all required ok, else 503. Never throws, no secrets leaked (tested).
- tests/unit/health/checks.test.ts: 7 tests (ok when full, false on missing required, short secret, NVIDIA degrades ok=true but ai_ready=false, no-leak guard, etc.).
- Process: systematic-debugging (logs), TDD, code-reviewer subagent (APPROVE 0 blockers), gates (typecheck/lint/no-auto-send/tests).
- Pushed cleanly (no AI trailer).
- Already wired: vercel.json/netlify.toml rewrite /healthz, README local mention, ERRORS.md, partial MEMORY.

**Deliberately NOT pushed (to avoid clobber):**
- .env.example (remote has fuller version with Langfuse etc.).
- README.md (local long internal vs remote short public "building in public").

**Learning for perfect files / no confusion:** "Unknown error" now diagnosable by opening /api/v1/health (or /healthz). Add health to all future "troubleshooting" in deploy docs and pastes. Update ERRORS with "env misconfig == use /health first".

**Next rec (as in log):** Reconcile MANIFEST (done: note updated with health + slice status). Before next feature (e.g. more GRM prep or user scenarios), ensure active_slice reflects shipped.

**Tag:** lienliberator
**Cites:** the health commit log, checks.ts, route.ts, test.ts, current MANIFEST note edit.

**Broad research synthesis (this session, "research all")**:
Added to REMAINING_WORK: 8+ distinct 2026 scenarios from full searches (₹2 unknown + comments, 19mo student Ombudsman case, layer 3+ trader/P2P with large over tiny, no-FIR/blanket ruled illegal by Delhi/Madras/Allahabad HC, P2P/crypto chains, cross-state no-response, KYC/suspicious, UPI ID freezes).
For each: User pain/sources, official path (SOP 7d/15d GRM, Baroda steps, court rulings, escalation from comments/X), "How Unhold helps" (analyzer for pattern explanation + GRM context, tailored checklist, sealed bundle for submission, GRM letters, tracker for timelines/escalation, next steps with real advice like "grievance email first, cite only disputed").
RAG expanded with chunks (long-delay-ombudsman, court-rulings, p2p-chain).
Prompt updated for variety.
All MDs (FAQ, etc.) aligned with refs.
**Decisions**: Keep Phase 1 (positioning consistency + RAG + GRM-prep in wizard). No over-scope. Harness for future (RESEARCHER for new refs). Perfect docs for Claude (clear sources, "how much to change", "never contradict GRM primary").
**Next**: Use this for wizard enhancements (e.g., scenario-specific output in analyzer). Update pastes with research summary.

**Updates from this deeper read:**
- Expanded REMAINING_WORK "Primary Research Inputs" with detailed comment quotes/patterns.
- Added new RAG chunk "escalation-paths" (grievance email → RBI Ombudsman, only disputed amount).
- Updated notice prompt suggested_next to include specific "Email the bundle to grievance officer... escalate to RBI Ombudsman".
- Enhanced checklist with "proof of communication with bank grievance".
- FAQ now includes community escalation language tied to Unhold bundle.
- All references explicit so future Claude knows exact sources and why changes were made.

This makes the project maximally useful for the exact user: panicked innocent receiver of tiny unknown UPI who needs the right first action (bank grievance email with professional package) + backup (RBI) + GRM alignment. Not waste — directly addresses what real people are doing and struggling with.

**Tag:** lienliberator
**Cites:** Reddit threads (r/bangalore 1rsrcgo, r/UPI 1rsrh9c), I4C SOP 2026 (7d/15d/GRM), prior RAG/prompt/docs edits

---

## 2026-06-24: Fixed "unknown error occurred" (opaque 500) + added config diagnostic
**Decision**: Owner's testing error was the generic 500 from a REQUIRED-env throw (Supabase service-role / GUEST_JWT_SECRET<32 / CRON_SECRET), not the NVIDIA key (missing AI key degrades to manual entry, never errors). Shipped (backend-only, surgical):
- `.env.example` (new, code-sourced from all `process.env.*` refs) — README already told testers to `cp .env.example .env.local` but the file never existed.
- `GET /api/v1/health` + `lib/health/checks.ts` — per-dependency `configured` booleans + hints, NO secret values, never throws, unauthenticated (reachable when misconfigured). 200 if required ok else 503.
- `tests/unit/health/checks.test.ts` (7 tests incl. no-leak guard). README first-run note pointing at /api/v1/health.
**Why**: every config failure collapsed to one blind message; testers couldn't tell which dep was unset. Now self-diagnosing.
**Process**: systematic-debugging (traced throw chain, didn't guess) → TDD → code-reviewer subagent APPROVE (0 blockers) → gates green (typecheck/lint/no-auto-send pass; 176/177 unit, the 1 = known flaky verifier PDF timeout, passes isolated). See ERRORS.md 2026-06-24 entries.
**Rejected**: changing handleRouteError to expose raw errors (would leak internals; current hide-internal-detail design is correct — a dedicated booleans-only health endpoint is the secure way). Guessing it was the API key (it wasn't).
**Cites**: lib/supabase/admin.ts:9, lib/api/response.ts:55-56, lib/auth/guest.ts:26, lib/llm/nvidia.ts:110.

---
(Append only. Never contradict without explicit flag.)

---

## 2026-06-30: Letter copy UX + verification harness cleanup

**Decision**: Keep the letter page copy-only, but make the approved draft button actually copy the mail-ready text when no parent `onCopy` handler is passed. The copied format is `Subject: ...` followed by a blank line and the body.

**Why**: The page rendered approved letters but did not wire `onCopy`, so the enabled "Copy to clipboard" button could do nothing. That is a real user-facing failure for a stressed user preparing bank/GRM submissions.

**Rejected**: Adding auto-send, email APIs, or broader drafter/RAG rewrites in this slice. Official channels remain user-submitted only.

**Verification**: Added `tests/unit/components/LetterPreview.test.tsx`; full gates were run with `corepack pnpm` and Git Bash for the shell script.

**Tag:** lienliberator

---

## 2026-06-30: Windows verification command convention

**Decision**: On this Windows workspace, use `corepack pnpm ...` instead of bare `pnpm`, and run `scripts/verify-no-auto-send.sh` via `C:\Program Files\Git\bin\bash.exe`.

**Why**: Bare `pnpm` resolved to 11.7.0 while `package.json` declares pnpm 10.12.1, causing `node_modules` purge prompts in a non-interactive shell. Bare `bash` resolved to WSL, but WSL has no installed distribution here.

**Rejected**: Treating those as product failures. They are local verification-shell issues, not app behavior.

**Tag:** lienliberator
