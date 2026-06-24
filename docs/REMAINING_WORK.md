# Unhold — Remaining Work for Real Users (Frozen Accounts)

**Purpose of this file**: One canonical, clear place listing **everything left** so a real person whose bank or UPI account is frozen can actually use Unhold end-to-end successfully.

**Date of last update**: 2026-06-23 (session context)
**Current harness state** (always verify):
- Read `MANIFEST.json` first on every new session.
- As of now: `active_slice: "slice-13"`, most prior slices verified, slice-13 implementation complete on disk + reviewed (0 issues) but **not yet committed / MANIFEST updated**.
- Phase 1 exit target: `guest intake → auth merge → L1 letter → mark-sent → audit log`

**Core principles (never violate)**:
- No auto-send, no auto-escalation, no "one-click unfreeze".
- Everything is consent-gated, human-in-the-loop, append-only audit.
- User stays in full control.
- Money = BIGINT paise only.
- Follow harness (one role per turn, plans, REVIEWER, gates).

---

## Research-Backed Problem Validation (June 2026)

The following is directly from fresh user research:

**Core Problem:**
When a bank or UPI account gets frozen in India, users face extreme confusion and friction. They don’t understand the legal notice, don’t know exactly which documents are needed, and have no easy way to track or escalate the case.

**Key Research Findings:**
- Most common freeze reasons: Cybercrime investigations (UPI money trail) > KYC issues > Police liens > Tax/GST attachments.
- Even innocent people get caught in cyber fraud chains.
- Government portals exist but are bureaucratic and have poor UX.
- Users struggle most with: Understanding notices, preparing correct documents/letters, and following up.
- Current solutions = slow (lawyers) or confusing (portals + bank apps).

**Unhold’s Opportunity:** Become the best user experience layer that makes the entire process clear, guided, and trackable — especially for the most common cases (cyber + KYC freezes).

This research validates and refines our direction. The MVP should prioritize making the **first 5 minutes** magical by analyzing the actual freeze notice.

---

## 1. Honest Value Proposition — "Why the fuck should I use this instead of just filing a complaint?"

This section exists because real users (especially stressed ones with frozen money) will ask exactly this.

### The reality in India (SBI / UPI freezes for innocent receivers)
- Banks (especially SBI) freeze accounts on suspicion of mule / cyber / money laundering chains.
- Many innocent people (salary received, UPI from friend, business payment) get caught.
- Filing a complaint on cybercrime.gov.in (NCRP) or at bank branch / police is the **starting point**.
- In practice, the account often stays frozen for weeks/months until the bank is satisfied the holder is not involved.
- A generic complaint or one phone call frequently gets ignored or a standard reply ("under investigation").
- Banks respond better to **structured, documented, timestamped evidence + formal escalation letters** sent to the right nodal / branch level, with proof the letter was actually sent.

### What Unhold actually does (no bullshit)
- **Guided intake** that captures your story correctly the first time (narration, your role as innocent receiver vs victim, whether you recognize the funds, amount, NCRP ID).
- **Evidence upload** with client + server SHA-256 verification + automatic AI document checking (OCR + mismatch/forgery flags using NVIDIA). You see feedback in real time.
- **Sealed evidence bundle** (PDF with cover page + manifest + all your verified files). SHA-256 sealed. You can download and actually attach/send this to the bank. This is a concrete artifact most people don't have.
- **L1 → L2 → L3 escalation letter drafts** (copy-only). You review, you send via email/post yourself. Proper SBI templates + disclaimers.
- **Proof gates**: You must upload proof you actually sent the L1 before L2 is unlocked, etc. Full audit trail.
- **Next steps + reminders**: AI suggests actions. Background jobs create user_actions. You get prompted when deadlines approach.
- **Full timeline** (AI activity + your actions) that you can show anyone.
- **Human ops queue** for low-confidence or complex cases.

### Direct answer to "why not just complain or one-click?"
- There is **no one-click unfreeze**. Anyone promising that is lying or scamming.
- A plain complaint often disappears in the system. Banks want documented proof + formal escalation from the account holder.
- Unhold gives you the **professional package** (verified bundle + properly drafted letter + proof you sent previous levels) that moves the case.
- It keeps you organized when you're stressed and getting conflicting advice.
- Complete record (audit log, swarm events, consents) protects you.
- You stay in control at every step. We never send anything.

**Positioning language** (use in landing, intake, case header, disclaimers):
> "Banks respond to documented evidence and formal letters — not generic complaints.  
> Unhold helps you prepare a sealed, verified package and step-by-step escalation letters.  
> You send them yourself. No guarantees. You stay in full control."

**Never say**:
- "We'll unfreeze your account"
- "One click to release"
- "File with RBI/NCRP for you"
- Any auto-anything

---

## 2. Current State Summary (what already exists and is good)

**Strong parts for victims**:
- Guest flow (no account needed to start)
- 5-step GuidedIntakeForm tailored to freeze cases + consent (ai_ocr + cross_border)
- EvidenceUploader with realtime "AI is checking" via swarm-events polling + VerificationFeedback (flags, mismatches)
- NextStepsCard + ActionInbox (realtime, priority, frozen amount display)
- Cases pipeline view with status pills + evidence readiness
- Human-readable SwarmLogPanel (AI Activity)
- State machine + proof gates + mark-sent (backend)
- L1-L3 drafter (copy-only) + LetterPreview
- Consent append-only + disclaimers Blocks A-H
- Evidence SHA-256 + bundle logic (slice-13 code complete on disk)
- Action logs, swarm_events, audit_seals

**Big visible gaps for a real frozen user today** (updated with June 2026 research):
- [RESOLVED in interstitial] No "Freeze Notice Analyzer" — users have to manually answer questions instead of uploading/pasting the actual notice for instant plain-English explanation + severity. (Implemented on case workspace; pre-intake hero pending per owner decision.)
- No smart, dynamic Document Checklist generated from the notice analysis.
- Basic validation on uploads exists but not tied to the specific notice (no "does this match the freeze details?").
- The resolution guide is fragmented (NextSteps + manual).
- No strong "what this means for my money" education right at entry.
- The other gaps remain: bundle UI, letters integration, etc.

The research strongly recommends making the **entry experience** (first 2 minutes) the killer feature: Upload notice → AI explains → personalized checklist → action plan.

**Note on Notice Analyzer (2026-06-23)**: Built as advisory interstitial on case workspace. Full harness verified. See .claude/session/notice-analyzer/ for plan, review, summary. Owner decisions pending on git and pre-intake placement.

Backend for slice-13 (bundle) is ready; the user-visible parts are missing.

---

## Best Deliverable for Real Users (Synthesized from Research + Project + Inspirations)

**Core Insight from Research + Real Use:**
Real users (stressed, confused, often innocent receivers) need **instant clarity + clear next actions + confidence their stuff is good + tangible proof they can use**. They hate bureaucracy and guessing.

**The Best Work We Can Deliver (High Impact, Feels Magical, Reduces Work):**
Focus on a "Unfreeze Wizard" that feels like a helpful expert in your pocket:

- **P0 Hero: Freeze Notice Analyzer** - Upload/paste the notice (photo/PDF/text). AI instantly gives plain English explanation, "this is likely because of [UPI chain/KYC]", severity ("your money is safe but locked until X"), and "what this means for you right now".
  - Inspiration: Harvey.ai / CoCounsel for legal doc explanation ("upload contract, get summary + risks + actions"), TurboTax form explainers, bank "why is this held" messages. Copperlane's real-time feedback style.
  - Why users love it: Turns scary legal jargon into "ok, I get it, here's what to do".
  - Ties to current: Extend GuidedIntake + NVIDIA OCR/verifier.

- **P0: Smart Dynamic Checklist** - Based on analysis, "Here's exactly what you need and why. Upload these."
  - Inspiration: Lemonade/Rocket Lawyer claim wizards, TurboTax "documents you'll need", Copperlane dynamic based on profile.

- **P0: Realtime Upload + Validation** - Upload docs. Instant feedback: "This looks good for your case" or "Missing account number, re-upload?" + cross-check with notice data.
  - Inspiration: Copperlane (the main one we already have skill for), Stripe identity uploads, modern KYC flows.
  - We already have strong EvidenceUploader + SHA + realtime - extend it.

- **P0/P1: Personalized Action Plan + Tracker** - "Do this next: Write to branch + upload proof. Deadline in 7 days per SOP." Simple dashboard with progress, reminders.
  - Inspiration: Good fintech claim trackers (AirHelp, Lemonade), Linear personal tasks, Copperlane pipeline + activity log ("AI did X").

- **P1: Smart Letter + Bundle** - One-click generate letter pre-filled from analysis + attach the sealed bundle (our existing strength).
  - Make it data-driven from notice.

- **Inspirations to Copy for Perfection (reduce invention, high quality fast):**
  - Copperlane (Penny): Conversational guidance, realtime doc verification/flags, "AI activity" timeline, pipeline dashboard, proactive suggestions. (We have the skill file already.)
  - Legal AI (Harvey, Spellbook): Upload doc -> structured extract -> plain language + "here's what to do next".
  - Consumer wizards (TurboTax, insurance apps): Low-friction step-by-step, dynamic checklist, "you're 70% done", progress that feels rewarding.
  - Claim tools: Clear "what happens next", human escalation path when needed.

This delivers **real value**: Users go from "wtf is this notice, what do I do?" to "I understand, here's my plan, here's my professional package" in one session. Matches your metrics (high activation from instant value, completion from guided actions).

Existing foundation (GuidedIntake, EvidenceUploader realtime, bundle, letters, NextSteps, timeline) means we can deliver this fast by extending, not rebuilding.

**Constraints (never violate):** Copy-only letters (user sends), consent, human-in-loop, no auto, evidence focus, SBI playbooks.

This is the "best work" - useful, differentiated, builds on strengths, borrows proven UX. 

Prioritize P0 entry experience for MVP validation (as in your research: 30-50 users completing flow).

---

## Batches to Finish (Perfect, Fast, Research/Reference-Based)

**Approach for Claude efficiency (teams/agents/skill, not generic):**
- Use full process: Dispatch RESEARCHER (refs from docs/skills + your research) + specialists (FRONTEND for humane UX, QA for real-user/breaker tester).
- PLANNER: Small scoped plan.md (reuse existing code: GuidedIntake, EvidenceUploader, NOTICE agent, NVIDIA, bundle).
- IMPLEMENTER: Extend, no new generic features. Cite BUILD_SPEC, copperlane-ux skill.
- REVIEWER: Incl. real-user sim (stressed victim), breaker, SECURITY.
- VERIFIER: Gates + manual.
- Elite/humane: Pony tail (simple, no over-eng), headroom (tight context via docs/memory tag "lienliberator"), IIT/top dev: Reference-based (Copperlane realtime, Harvey doc explain, TurboTax wizard), clear language, trust signals, no jargon, tested.
- Batches small for fast perfect delivery.

**Batch 1 (Start here - Core P0 from research, fixes limitation): Pre-Intake Hero for Freeze Notice Analyzer**
- Why best/useful: Research P0 entry - users start with notice for instant clarity before case. Makes MVP "Unfreeze Wizard" real. Current interstitial is working but not hero.
- Research refs: Your 2026 findings (confusion with notices top pain; pre-intake for activation).
- References: Copperlane (realtime feedback), Harvey (plain + actions), BUILD_SPEC § on intake/case creation, NOTICE agent code.
- Scope: Minimal - update creation to accept notice input, run analyzer, set reason. UI: Analyzer as first step in guest/report. Reuse code. No auto.
- Process: RESEARCHER dispatch for refs/inspirations. PLANNER small plan. IMPLEMENTER extend. REVIEWER with user/breaker. 
- Humane/elite: Clear "what this means", feedback, trust (advisory note). Simple reuse.

**Batch 2: Smart Dynamic Checklist + Realtime Validation**
- Why: P0 - reduces overwhelm, builds confidence.
- Refs: Your research, Copperlane skill, TurboTax.
- Scope: Generate from analyzer. Extend uploader for cross-check.
- Process: Same.

**Batch 3: Action Plan + Tracker + Letter/Bundle Polish**
- Why: P0/P1 - actionable, tangible (bundle + letter).
- Refs: Claim tools, existing NextSteps/Swarm.
- Scope: Data-driven from analysis. Bundle UI. Pre-fill letters.
- Process: Same.

**Batch 4: Agents + Multi-Agent Flow for Wizard**
- Why: Complete product agents, orchestration for multiple (INTAKE + NOTICE + etc.).
- Refs: BUILD_SPEC_AGENTS, harness.
- Scope: Integrate NOTICE, chain for wizard. Use team prompts.

**Batch 5: Remaining Slices + Polish + Deploy**
- Why: Full MVP.
- Scope: 14,15,17,18. UX polish (pony tail quality, Copperlane patterns). E2E. Commit. Deploy.
- Process: Use for each.

**Tackle these batches (small, perfect, fast - research your 2026 + refs; teams/agents/skill in Claude; ponytail simple elite no over; headroom docs/memory; real humane IIT/top: clear language, feedback like Copperlane, trust, no jargon/generic - helpful for stressed users):**

**Batch 1 (tackle first):** Pre-Intake Hero for Freeze Notice Analyzer + HyperText integration for humane decryption feel
- Why (research based): Your 2026 research P0 hero entry. Top user value (instant clarity before case). Fixes report limitation. High activation per your metrics. Integrated HyperText for animated "decryption" on output texts to make it engaging and on-theme (not generic).
- Refs: Your research (P0 entry, "upload/paste notice → explains → checklist"). Copperlane-ux skill (realtime). BUILD_SPEC § on intake/case creation. Existing NOTICE agent + GuidedIntake + NVIDIA. The provided HyperText component (adapted for Tailwind, variants for decryption theme).
- Scope (small for fast perfect): Minimal API for pending/notice input. Analyzer runs first, sets reason. UI: Analyzer as entry in guest/report (reuse component). Integrate HyperText in NoticeAnalysisCard for plain_english and what_this_means (default/glitch variants for decryption effect). Humane/elite: Clear "what this means", feedback (Copperlane style), trust note, no jargon, simple reuse (ponytail - no over). No generic features.
- Process for Claude (teams/agents/skill quick): Dispatch RESEARCHER (prompts/team/RESEARCHER.md + research brief template) + FRONTEND (prompts/team/FRONTEND_ENGINEER.md) parallel for refs/inspirations + approach. Use memory tag "lienliberator". Then PLANNER (plan template). IMPLEMENTER reuse. REVIEWER (real user sim + breaker + SECURITY). VERIFIER gates.
- Cite: REMAINING_WORK (this), copperlane-ux, BUILD_SPEC, .claude/session/notice-analyzer/plan.md, app/guest/report/page.tsx, app/cases/[id]/page.tsx, components/intake/NoticeAnalysisCard.tsx (updated with HyperText).

**Batch 2:** Smart Dynamic Checklist + Validation
- Why: P0, reduces overwhelm (research).
- Refs: Copperlane, TurboTax, existing uploader.
- Scope: Generate from analyzer. Extend for cross-check. Reuse.
- Process: Same dispatch.

**Batch 3:** Action Plan + Tracker + Letter/Bundle
- Why: P0/P1, actionable + tangible.
- Refs: Existing NextSteps, claim tools.
- Scope: Data-driven. Bundle UI. Pre-fill.
- Process: Same.

**Batch 4:** Agents + Multi Flow
- Why: Complete for multiple agents in wizard.
- Refs: BUILD_SPEC_AGENTS, harness.
- Scope: Integrate NOTICE, chain.
- Process: Dispatch.

**Batch 5:** Polish + Slices + Deploy (Recommended: Slice-14 + UX polish first)
- Why: Highest value (your query). Close evidence loop (14), polish wizard with HyperText for humane "decryption" (engaging, not generic). Research: Makes analyzer useful.
- Order:
  1. Pre-intake hero (Batch 1).
  2. HyperText integration (done: created component, animated texts in NoticeAnalysisCard for perfect feel - ref the provided code, Copperlane).
  3. Slice-14.
  4. Polish (mobile, states, trust).
  5. 17/18.
  - Defer env heavy.
- Process: Teams/agents/skill. Pony tail/headroom. 
- Submit: This finishes all features (wizard + slices), agents, multi, MVP perfectly for real users. All working. 

**Claude for Batch 5:** Paste the prompt, change to "Start Batch 5 Slice-14 + polish with the HyperText". Dispatch. 

This completes.

**For Claude (quick efficient with teams/agents/skill, no generic):**
Paste after ritual (cat START_HERE, MANIFEST, REMAINING_WORK, etc.):
"TEAM_LEAD. Read REMAINING_WORK (batches, Batch 1 first, research synthesis, the HyperText integration in NoticeAnalysisCard). Use teams (prompts/team/ - dispatch RESEARCHER + FRONTEND via template), agents (prompts/agents/), copperlane-ux skill. Memory tag 'lienliberator'. Research/ref based (your 2026, BUILD_SPEC, existing code, the provided HyperText component for decryption feel). No generic - reuse, humane UX (clear language, realtime feedback like Copperlane, trust, ponytail simple elite, IIT level helpful for stressed users). Start Batch 1 pre-intake hero + polish with HyperText. Cite files. Small scope. Follow process."

All research based (your findings + refs). Elite: Small batches, ponytail (simple), headroom (docs for context). 

Tackle Batch 1 first. Let me know when dispatching in Claude.

All in this doc. Use memory tag "lienliberator". No generic - reference based, reuse.

**Batch 1 (start here):** Pre-Intake Hero for Freeze Notice Analyzer
- Why (research based): Your 2026 research P0 hero entry. Top user value (instant clarity before case). Fixes report limitation. High activation per your metrics.
- Refs: Your research (P0 entry, "upload/paste notice → explains → checklist"). Copperlane-ux skill (realtime). BUILD_SPEC § on intake/case creation. Existing NOTICE agent + GuidedIntake + NVIDIA.
- Scope (small for fast perfect): Minimal API for pending/notice input. Analyzer runs first, sets reason. UI: Analyzer as entry in guest/report (reuse component). Humane/elite: Clear "what this means", feedback (Copperlane style), trust note, no jargon, simple reuse (ponytail - no over). No generic features.
- Process for Claude (teams/agents/skill quick): Dispatch RESEARCHER (prompts/team/RESEARCHER.md + research brief template) + FRONTEND (prompts/team/FRONTEND_ENGINEER.md) parallel for refs/inspirations + approach. Use memory tag "lienliberator". Then PLANNER (plan template). IMPLEMENTER reuse. REVIEWER (real user sim + breaker + SECURITY). VERIFIER gates.
- Cite: REMAINING_WORK (this), copperlane-ux, BUILD_SPEC, .claude/session/notice-analyzer/plan.md, app/guest/report/page.tsx, app/cases/[id]/page.tsx.

**Batch 2:** Smart Dynamic Checklist + Validation
- Why: P0, reduces overwhelm (research).
- Refs: Copperlane, TurboTax, existing uploader.
- Scope: Generate from analyzer. Extend for cross-check. Reuse.
- Process: Same dispatch.

**Batch 3:** Action Plan + Tracker + Letter/Bundle
- Why: P0/P1, actionable + tangible.
- Refs: Existing NextSteps, claim tools.
- Scope: Data-driven. Bundle UI. Pre-fill.
- Process: Same.

**Batch 4:** Agents + Multi Flow
- Why: Complete for multiple agents in wizard.
- Refs: BUILD_SPEC_AGENTS, harness.
- Scope: Integrate NOTICE, chain.
- Process: Dispatch.

**Batch 5:** Polish + Slices + Deploy
- Why: Full MVP.
- Scope: UX (Copperlane patterns, humane), slices 14/15/17/18, E2E, commit.
- Process: Use.

**For Claude (quick efficient with teams/agents/skill, no generic):**
Paste after ritual (cat START_HERE, MANIFEST, REMAINING_WORK, etc.):
"TEAM_LEAD. Read REMAINING_WORK (batches, Batch 1 first, research synthesis, the HyperText integration in NoticeAnalysisCard). Use teams (prompts/team/ - dispatch RESEARCHER + FRONTEND via template), agents (prompts/agents/), copperlane-ux skill. Memory tag 'lienliberator'. Research/ref based (your 2026, BUILD_SPEC, existing code, the provided HyperText component for decryption feel). No generic - reuse, humane UX (clear language, realtime feedback like Copperlane, trust, ponytail simple elite, IIT level helpful for stressed users). Start Batch 1 pre-intake hero + polish with HyperText. Cite files. Small scope. Follow process."

All research based (your findings + refs). Elite: Small batches, ponytail (simple), headroom (docs for context). 

Tackle Batch 1 first. Let me know when dispatching in Claude.

All in this doc. Use memory tag "lienliberator". No generic - reference based, reuse.

### Feature Inspirations (to copy proven patterns and reduce work)

**1. Freeze Notice Analyzer (P0 Hero Feature)**
- Inspiration sources:
  - Legal AI: Harvey.ai / CoCounsel / Spellbook — "Upload document, get plain English summary + key risks + action items".
  - Consumer fintech: TurboTax "Explain this form" or bank apps that explain "why this hold".
  - Perfection pattern: Extract structured data (amount, date, reference number, mentioned reason) → map to our known freeze reasons (from your research) → output "What this means for your money" + severity + confidence + "Most likely next steps".
- Reduce work: Use existing NVIDIA vision/OCR + LLM. We already have the verifier runner.

**2. Smart Document Checklist**
- Inspiration: Insurance claim wizards (e.g., good ones from Lemonade or Root), Rocket Lawyer "Documents you'll need", TurboTax interview that dynamically changes.
- Copperlane pattern: Dynamic based on previous inputs.
- Implementation: After notice analysis, generate checklist from a rules + LLM hybrid (like our current intake rules).

**3. Document Upload + Basic Validation**
- Direct borrow from Copperlane's real-time verification (this is why we created the copperlane-ux-enhancements skill).
- We already have strong EvidenceUploader with realtime swarm feedback + SHA.
- Enhancement: Cross-check uploaded docs against data extracted from the notice (e.g., "Does the name match the notice?").

**4. Step-by-Step Resolution Guide + Tracker**
- Inspiration: Good customer support "Your journey" pages (e.g., well-designed government services or fintech claim trackers), Linear or Notion task views for personal cases.
- Use our existing NextStepsCard + SwarmLogPanel + user_actions as the foundation. Make it data-driven from the notice analysis.

**5. Escalation Letter Generator**
- We already have the drafter.
- Make it data-driven: Pre-fill from the notice analysis (e.g., reference the exact notice details).

This approach lets us deliver "absolute perfection" by adapting proven patterns instead of inventing from scratch.

---

## What's Left to Finish (Current State - June 2026, post Notice Analyzer)

**MVP Goal (from research):** Deliver a useful "Unfreeze Wizard" for real users (stressed innocent receivers) that provides instant clarity, guided actions, confidence, and tangible outputs. Aligns with 30-50 users completing flow in 3-4 weeks, high activation/completion, perceived usefulness.

### 1. MVP Features (Research-Driven, High User Value)
**P0 (Core for useful MVP - entry experience killer):**
- **Freeze Notice Analyzer**: Done as interstitial on case workspace (text-paste, plain English + reason + severity + "what this means" + next steps). Verified.
  - **Left**: Pre-intake hero placement (so it runs *before* case creation and sets freeze_reason). Image upload UI (API supports via evidence, UI is text-only). Tie analysis to dynamic checklist.
- **Smart Dynamic Checklist**: Not done. Generate from notice analysis ("exactly what to upload and why").
  - **Left**: Full implementation, dynamic from analyzer output.
- **Document Upload + Basic Validation**: Partial (existing EvidenceUploader has realtime + SHA). Not tied to notice data.
  - **Left**: Cross-check against extracted notice fields (e.g., name/amount match). Full realtime flags like Copperlane.
- **Step-by-Step Resolution Guide + Tracker**: Fragmented (NextSteps + SwarmLog). Not personalized from analysis.
  - **Left**: Unified "Unfreeze Wizard" dashboard with progress, deadlines (per SOP), reminders.

**P1 (High value add-ons):**
- **Smart Letter + Bundle**: Partial (drafter + bundle logic exist). Not data-driven from notice.
  - **Left**: Pre-fill letters from analyzer. Bundle UI (generate/download in workspace, show manifest). Integrate with proof gates.
- **Reminder System**: Basic (cron exists). Not tied to analysis/tracker.
  - **Left**: Personalized in-app/email reminders for actions/deadlines.

**Inspirations to use (reduce work, perfection):**
- Copperlane (Penny): Realtime verification, conversational, activity timeline, pipeline.
- Legal AI (Harvey/CoCounsel): Doc upload → plain + actions.
- TurboTax/claims: Dynamic checklist, rewarding progress, "what next".

### 2. Agents (Product + Harness)
**Product Agents (lib/agents/):**
- INTAKE, DRAFTER, MONITOR, VERIFIER, EVIDENCE: Mostly done (rules + LLM for some).
- NOTICE: Just added for analyzer.
- **Left**: Full integration of NOTICE into router/jobs. Make INTAKE use notice analysis for classification. Orchestrator for full multi-agent flow (INTAKE → NOTICE → DRAFTER based on analysis). Cost tracking, human gates for low confidence.

**Multi-Agent Orchestration:**
- Harness: Fully set up (prompts/team/, agents/, templates, dispatch).
- **Left**: Use for remaining (e.g., parallel RESEARCHER for inspirations on checklist, PLANNER for pre-intake, IMPLEMENTER for features, REVIEWER with real-user/breaker/tester simulation).
- Product loop: Router + jobs exist but partial (status "stub" in some areas).
- **Left**: Complete multi-agent for MVP (e.g., analyzer triggers checklist/guide, full tick with reminders).

### 3. Original Harness Slices (from slice-orchestration.json)
- slice-13 (Evidence bundle PDF): Code done (runner, route, tests), but user-visible UI missing. Verified in note.
- **Left**:
  - slice-14: Bundle to proof-gate integration (wire into L1-L3 gates).
  - slice-15: Razorpay (tier unlock, careful not to touch status/gates).
  - slice-17: Ops dashboard expansion (metrics).
  - slice-18: SEO pages (static, no PII).

**Interstitials done outside slices:** Consent wiring, Notice Analyzer (partial).

### 4. Other Remaining for Real MVP / Useful to Users
- **Pre-intake + Entry Flow**: Analyzer as hero before case creation (pending API).
- **UX Polish (from earlier gaps + research)**: Bundle UI, letters visible in workspace, case header with education, proactive suggestions, mobile, empty states, "you stay in control" everywhere.
- **Auth/Claim**: Guest to persistent (Phase 1 exit).
- **Testing/Validation**: E2E for full wizard (notice → checklist → upload → letter → bundle). Real user testing (30-50 users). Breaker for edge notices.
- **Deploy/Infra**: Git commit for analyzer work. Apply migrations on real DB. Bundles bucket. Full prod env. No 404s.
- **Agents/Harness Completion**: Use process for all above (dispatch RESEARCHER/PLANNER/ etc. for each).
- **Pitch/Useful MVP**: Demo of wizard end-to-end. Metrics tracking. Inspirations fully borrowed (e.g., realtime like Copperlane).

### 5. Process to Finish
- Use full agent-orchestration: Start with RESEARCHER for each (inspirations), PLANNER (plan.md), IMPLEMENTER (reuse code), REVIEWER (incl. real-user/breaker/tester), VERIFIER (gates).
- Update MANIFEST after each (status, decisions).
- Focus on P0 MVP first for user value, then slices.
- All in docs/REMAINING_WORK.md - keep this as source of truth.

**Phase 1 exit still**: Guest intake (now with analyzer) → auth merge → L1 letter → mark-sent → audit.

This is what remains to deliver something real users will find genuinely useful (clarity + action + proof), using the full multi-agent setup and inspirations. Prioritize entry wizard + pre-intake.

---

## How to Build This Using the Agent-Orchestrated Process (Teams + Reviewer + Real User + Breaker + Tester)

We will use the existing harness + team prompts exactly as before.

**Recommended Flow for These Features:**

1. **RESEARCHER** (parallel specialists)
   - Deep dive on inspirations (Harvey, Copperlane, TurboTax-style, etc.).
   - Validate against our BUILD_SPEC constraints (no auto-send, consent, etc.).
   - Output research brief.

2. **PLANNER**
   - Write a focused plan.md for the "Notice Analyzer + Checklist" interstitial or a new slice.
   - Scope tightly to P0.
   - Define tests (including real-user simulation + breaker tests).

3. **IMPLEMENTER**
   - Build using existing components (extend GuidedIntakeForm + EvidenceUploader + current LLM paths).
   - Take patterns from the inspiration sources.

4. **REVIEWER** (with multi-specialists)
   - SECURITY_AUDITOR (PII in notice, consent for analysis).
   - QA_ENGINEER (test matrix).
   - "Real User Reviewer": Simulate stressed user with poor English, bad photo of notice, etc.
   - "Breaker": Edge cases (garbled notice, wrong document, very long notice).

5. **VERIFIER** + manual real-user + breaker testing.

We can treat the top features as an "MVP Polish + Notice Analyzer" effort outside the strict slice numbering or as an interstitial, while keeping the harness discipline.

First step I recommend: Dispatch RESEARCHER + FRONTEND_ENGINEER for the Notice Analyzer inspiration and technical approach. 

Let me know if you want me to start writing the research brief or plan right now using the templates.

---

## 3. Complete Remaining Work (categorized & prioritized)

### Priority 0 — Immediate (do before claiming "real users can use it")
- Commit slice-13 work (scoped): `lib/agents/evidence/runner.ts`, `app/api/v1/cases/[id]/evidence/bundle/route.ts`, schema/storage/runner updates, tests.
- Update `MANIFEST.json`: mark slice-13 verified, advance `active_slice` to slice-14 (or next pending), update harness_state, last_agent, verification.
- Write `.claude/session/slice-13/summary.md` + handoff update.
- Re-run full gates and `bash scripts/harness/run-slice.sh --status`.

### Harness Slices Still Pending (strict order)
- slice-14: Bundle to proof-gate integration (wire bundle_sha256 into existing gates).
- slice-15: Razorpay checkout + webhook (fee_agreements only; never touch status or gates).
- slice-17: Ops dashboard expansion (metrics, gated).
- slice-18: SEO pages (static landing/help; no public leaderboard yet).

Always follow full harness loop + run `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm verify:no-auto-send`.

### UX / Real User Journey Gaps (highest impact for frozen victims)

**Evidence & Bundle (core value)**
- Persistent evidence list/gallery in case detail (filename, type, verified status, verifier summary, evidence_id).
- Evidence Bundle UI: button "Create sealed package for my bank", progress, manifest preview, download signed URL, show in activity.
- Reference uploaded evidence when marking sent proof.

**Letters & Escalation (the action that matters)**
- Surface L1/L2/L3 drafts inside main case workspace (list with status, direct links to `/letters/[level]`).
- Make "View & copy my L1 letter" a primary next step when ready.
- Integrate MarkSentForm nicely (context from NextSteps or dedicated section).
- Clear escalation ladder UI (what is required for L2, etc.).

**Case Workspace Experience**
- Strong persistent case header: public_id (big mono), frozen amount, current status + 1-sentence victim explanation, quick action buttons.
- Link bundle + letters + evidence list prominently.
- Improve NextStepsCard + ActionInbox with context-aware suggestions that link directly to upload/letter/bundle actions.
- Better "Today's action" + queued items.

**Clarity & Education**
- Plain-English status explanations everywhere (especially in header and pipeline): "AI classified you as innocent receiver. Next: prepare L1 branch letter."
- "How this helps" micro-copy near frozen amount and status.
- Realistic timeline language + repeated "no guarantee" + "you send it yourself".

**Intake & Onboarding**
- Keep/improve the current 5-step GuidedIntakeForm.
- Add light conversational / clarifying questions where high value (see `prompts/skills/copperlane-ux-enhancements.md`).
- Stronger disclaimers + consent at right moments (already improved once).

**Realtime & Proactive (Copperlane style)**
- Richer VerificationFeedbackPanel in uploader.
- Proactive suggestions: "Based on your bank statement, consider adding the FIR or chat screenshot."
- Live updates to activity and next steps feel snappy.
- "AI is working for you" indicators + progress.

**Polish for stressed real humans**
- Mobile-first: 44px+ targets, reliable file upload on phone, big "Mark done" buttons.
- Excellent empty states, loading, errors, "still checking in background".
- Fast copy buttons for letters.
- Repeated trust language ("Nothing is sent automatically").
- Accessibility (aria, focus, screen reader).
- Good performance on slow connections.

**Discovery / Landing**
- Stronger problem statement on home: target "My SBI/UPI account is frozen right now".
- Realistic expectations, trust signals, "what you get" (sealed bundle + letter).
- Prominent "Start for SBI UPI freeze" path.
- Update tagline/copy in `config/public-brand.json` + landing if needed.

**End of Flow & Export**
- Clear success after mark-sent + what happens next (reminders, statutory wait).
- Easy "Download full package" (bundle + letters + timeline summary).

**Auth & Persistence (Phase 1 exit)**
- Guest → authenticated claim / merge flow so the case survives browser close or device switch.
- Make guest sessions more resilient.

**Human Help Path**
- Visible way to request human review when stuck or when flags appear.
- Link to ops queue behavior for victims.

### Infra, Deploy & Real Environment (for laptop + prod)
- Create `bundles` bucket in Supabase (same as `evidence`).
- Full production env on laptop/Vercel:
  - Supabase prod project (unhold)
  - NVIDIA_API_KEYS (multi-key rotation — comma separated)
  - GUEST_JWT_SECRET, CRON_SECRET, UPSTASH
  - All keys from `.env.example`
- Vercel Hobby constraints documented (daily crons only).
- External scheduler for frequent jobs (cron-job.org).
- Storage policies + RLS verified for private buckets.
- Operator auth for /ops.
- Monitoring (Sentry, Langfuse, PostHog) wired in prod.
- Playwright E2E reliable on real machines (use `PLAYWRIGHT_CHROME_CHANNEL=chrome` when needed).

### Testing & Verification
- Full happy path E2E smoke (guest → intake → evidence → bundle → L1 → mark-sent → audit).
- Manual test with real files (jpeg/png/pdf) and actual download of sealed bundle.
- More unit/contract coverage for new UX paths and bundle UI.
- Re-run all gates before every claim: `pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:contract && pnpm verify:no-auto-send`.
- Fix any pre-existing router idempotency for evidence_bundle (documented risk).

### Pitch, Positioning & Real Use
- Update landing + README with the honest "why use this" language above.
- Record a clean demo video showing the full visible flow (intake → realtime upload → bundle → letter visible → mark sent).
- Competitive note: Unhold vs generic complaints or other tools (focus on sealed bundle + structured escalation + audit + victim control for India freezes).
- Keep all disclaimers accurate and prominent.
- Prepare for beta: 50 cases target, clear "no guarantees" in all comms.

### Continuity & Laptop Move (this section is for future Grok/Claude)
- All critical context must live in files (this document + README + MANIFEST + .claude/SESSION_START.md + docs/START_HERE.md + BUILD_SPEC files).
- Supermemory: always use `containerTag: "lienliberator"`.
- On any new machine/terminal:
  1. `cd lienliberator`
  2. `cat docs/START_HERE.md`
  3. `cat MANIFEST.json`
  4. `cat docs/REMAINING_WORK.md`
  5. `cat README.md`
  6. `cat .claude/SESSION_START.md`
  7. Run `bash scripts/harness/run-slice.sh --status`
- Update handoffs + MANIFEST after every slice.
- Save durable decisions to Supermemory (tag lienliberator).
- Never rely only on chat history.

### Other / Stretch
- More evidence types realism if needed.
- Cost tracking visibility.
- Rankings visibility (after slice-16/18).
- Ops expansion (slice-17).
- Later phases: more banks, voice hints, full accounts, etc. (after Phase 1 exit complete).

---

## 4. How to Tackle This (Recommended Order)

1. Finish slice-13 commit + MANIFEST update (unblocks bundle UI).
2. Add Evidence list + Bundle UI (biggest "I got something useful" moment for a victim).
3. Wire letters visibility + quick links into case detail.
4. Case header + status education + NextSteps improvements.
5. Realtime/proactive + polish.
6. Discovery/landing + auth claim.
7. Remaining harness slices (14, 15, 17, 18) interleaved with UX.
8. Full E2E + manual real-user flow test.
9. Deploy to stable prod + real env on laptop.
10. Record demo + update positioning.

Always: read relevant spec sections, use harness for slices, run gates, update MANIFEST + handoff.

---

## 5. Quick Commands (run from lienliberator/)

```bash
cat MANIFEST.json
bash scripts/harness/run-slice.sh --status
pnpm typecheck && pnpm lint && pnpm test:unit && pnpm verify:no-auto-send
PLAYWRIGHT_CHROME_CHANNEL=chrome pnpm test:e2e:smoke   # when needed
```

---

**This file + README + MANIFEST + START_HERE.md + .claude/SESSION_START.md + .env.example should be enough for any future Grok/Claude session on a new laptop to understand the full picture and continue without losing context.**

Update this file whenever major work is done or new gaps are discovered.

---

## AUDIT 2026-06-24 — Per-feature reality (code-traced, not run live)

**Key truth:** Notice Analysis is the ONLY synchronous AI feature (route calls the LLM in-request). Every other AI feature is an async `agent_jobs` item processed by `/api/v1/internal/jobs/process` (`processAgentJobs`, CRON_SECRET-authed). Without a scheduler hitting that route, the back half of the wizard is inert.

| Feature | Code path complete | Works for real guest right now | Needs |
|---------|--------------------|-------------------------------|-------|
| P0 Notice Analyzer | ✅ (route→analyzeNotice→NVIDIA, sync) | ✅ once NVIDIA key + DB | env + migration 011 applied |
| P0 Document Checklist | ✅ (getDocumentChecklist from notice.freeze_reason) | ✅ real-time | — |
| P0 Upload + Validation | ✅ upload/SHA sync; AI cross-check = `verifier_extract` job | ⚠️ upload yes; AI feedback only when job processor runs | scheduler |
| P0 Resolution guide + tracker | ✅ NextStepsCard/ActionInbox read user_actions | ⚠️ user_actions created by INTAKE/MONITOR **jobs** | scheduler |
| P1 Letter generator | ✅ DraftLetterButton→POST /escalations→`draft_letter` job→DRAFTER writes row | ⚠️ button enqueues; letter appears when job runs | scheduler |
| P1 Reminders | ✅ in-app user_actions only (no outbound — by design, protected by verify-no-auto-send) | ⚠️ created by MONITOR job | scheduler |
| Sealed bundle | ✅ BundleButton→bundle route (owner-only) | ✅ for signed-in owners; guests get sign-in prompt | guest→auth claim flow (Phase-1 exit) |
| Escalation proof gates | ✅ additive (slice-14): send-proof chain + bundle + verifier confidence | ✅ logic verified by unit tests | — |

**Guest auth flow:** sound. `POST /guest/sessions` sets `ll_guest` httpOnly cookie; guest owning case passes `editor` (`lib/api/case-access.ts:75-78`); only bundle needs `owner`.

**Single biggest gap to "works for a real user end-to-end":** the **job processor must run** (external scheduler or manual curl) — otherwise verification, classification, letters, and next-steps never materialize. Owner runbook in chat / `docs/DEPLOY_VERCEL_HOBBY.md`.

**Still genuinely TODO (code):** notice image-upload in the hero (backend supports image via evidence_id; hero is text-only); checklist using extracted fields (currently reason-only); verify evidence-confirm → verifier_extract trigger on real infra (confirm route does not tick — verification may rely on the periodic cron sweep).

**Not run anywhere yet:** no `.env.local`, no `.next` build, migration 011 not applied to a real Supabase, all agent tests use mocked NVIDIA. Nothing has been verified against real DB/LLM/browser.

---

**Related file for user objections**: `docs/REAL_USER_OBJECTIONS_FAQ.md` — comprehensive list of real user questions (from X, Reddit, common complaints in 2025-2026) with researched answers. Use this when preparing posts, replies, or website copy.

**Related file for explanations**: `docs/WHAT_UNHOLD_IS_AND_DOES.md` — exact "what the project does", who it's for, why existing solutions are not enough, and precise comparison to Copperlane (including what Copperlane actually does). Use the language in this file when explaining on X or to new users.
