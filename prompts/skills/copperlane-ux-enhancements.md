# Skill: Copperlane-Inspired UX Enhancements for Unhold

## Overview
Port key user-facing and agentic UX patterns from Copperlane (YC W26 AI-native mortgage origination platform with "Penny" AI agent) to Unhold. 

Copperlane strengths to adapt:
- Proactive AI assistant ("Penny") that guides users conversationally, collects/verifies docs in real-time, asks clarifying questions, flags issues, and prepares clean output for humans.
- Borrower experience: chat/voice guidance, instant answers, auto-filled forms, document status ("X/Y docs ready"), real-time verification feedback (authenticity, flags like large deposits).
- Lender/ops experience: clean pipeline dashboard, activity log ("Penny activity"), flags, quick actions (e.g., "Chat").
- Human-in-the-loop by design: AI prepares, humans decide.
- Multilingual/voice support (adapt selectively).

**Unhold Adaptation Rules (non-negotiable per BUILD_SPEC and harness):**
- Domain: India bank/UPI freeze victims (SBI innocent-receiver focus), not US mortgages.
- Tone: Cautious, empowering, no guarantees ("you stay in control").
- AI usage: Always gated by consent (ai_ocr_processing, cross_border_ai). No auto-send, no auto-escalation.
- Evidence focus: Upload once, verify with SHA-256 + Verifier (NVIDIA), track for escalation letters.
- Keep existing architecture: Use current agents (INTAKE, VERIFIER, DRAFTER, MONITOR), state machine, action_logs, consent_records.
- No new deps without approval. Prefer incremental changes to existing components (DisclaimerModal, chat, upload flows, dashboards).
- Scope for this skill: Primarily frontend UX + light agent wiring for conversational/real-time feedback. Avoid full backend rewrites.

## Priority Features to Implement (in order)

### 1. Conversational AI-Guided Intake (Core "Penny" Adaptation)
- Replace or enhance static "Quick freeze report" form (/app/guest/report/page.tsx and /app/cases/new/page.tsx) with a guided conversational flow.
- AI (leveraging existing INTAKE agent + new light conversational wrapper) asks step-by-step:
  - "Tell me about the freeze in your own words."
  - "What evidence do you have? (bank statement, FIR, UPI details, etc.)"
  - Clarifying questions based on playbook (e.g., "Was this a mule account? Do you have transaction IDs?").
- Auto-suggest fields and pre-fill where safe from uploads or prior answers.
- Use existing chat infrastructure (enhance components/app/chat-workbench.tsx or create a dedicated intake chat).
- On completion: Create case with intake_json populated, trigger INTAKE agent.
- Add "AI is guiding you" UI indicator.

### 2. Real-Time Document Verification Feedback
- Enhance evidence upload (components/evidence/EvidenceUploader.tsx and related routes).
- After upload + confirm:
  - Immediately run lightweight VERIFIER (reuse runVerifierJob logic where possible, gated by consent).
  - Show live feedback UI (inspired by Copperlane's "AI Pre-verification"):
    - Green: "Document authenticity verified", "SHA-256 matches", "Account holder match".
    - Flags: "Large/unusual amount detected", "Potential split transaction", "Missing context for this merchant".
    - "Penny is asking: Where did this deposit come from? (Add note)"
- Store flags in evidence metadata or action_logs.
- Update case status and show in dashboard.
- Keep full Verifier for later if needed.

### 3. AI Activity Timeline ("Penny Activity" Log)
- Enhance existing activity views (components/case/SwarmLogPanel.tsx, ActionInbox.tsx, case detail pages).
- Add dedicated "AI Activity" section or tab showing chronological log of agent actions:
  - "INTAKE classified as innocent_receiver (confidence 0.87)"
  - "VERIFIER extracted details from statement; flagged X"
  - "DRAFTER prepared L1 letter draft"
  - "MONITOR suggested follow-up"
- Use existing swarm_events + action_logs. Make it filterable and human-readable.
- Expose on both victim (/cases/[id]) and ops views.

### 4. Pipeline Dashboard Improvements
- Enhance /app/cases/page.tsx and /app/dashboard/* (or ops views).
- Add visual pipeline: Cards or kanban-like for cases showing:
  - Status (New → Intake → Evidence Building → Escalation)
  - Doc count / readiness ("3/5 docs ready")
  - Flags / human_review_required
  - Quick actions: "Chat with AI", "View Letters", "Upload More"
- Borrow Copperlane's "Active Applications" + "Penny activity" feed.
- For guest users: Simple "Your Case" summary with progress.

### 5. Proactive Guidance & Q&A in Chat
- Improve existing chat (components/app/chat-workbench.tsx and /app/dashboard/chat).
- Make AI more proactive:
  - Suggest next steps: "Based on your evidence, consider adding the FIR."
  - Answer domain questions: "What is an escalation letter?"
  - Use playbooks for context.
- Tie to DRAFTER for letter previews.

### 6. UX Polish & Accessibility
- Consistent "AI is working for you" language.
- Progress indicators, clear "what's next".
- Mobile-friendly (already partial).
- Selective multilingual if time (start with English + Hindi hints).
- Retain all disclaimers, consent checkboxes (already enhanced).

## Implementation Guidelines
- **Start small**: Begin with guest/report and evidence upload flows (highest user impact).
- **Reuse**: Leverage INTAKE/VERIFIER runners, existing Zod schemas, Supabase queries, components/ui.
- **New code only where needed**: Light wrappers for conversational logic; avoid duplicating agent code.
- **Testing**: Add/update unit tests for new flows; ensure existing consent/state machine tests still pass.
- **Verification**: After changes, run: pnpm typecheck, pnpm lint, pnpm test:unit, pnpm verify:no-auto-send.
- **Scope control**: This is an enhancement skill, not a full slice. Keep changes additive. Flag any conflicts with BUILD_SPEC (e.g., no auto-escalation).
- **Copperlane deltas to avoid**: Do not add lender/bank-side tools, rate optimization, or full automation. Stay victim-centric + ops/human-gated.

## Files Likely to Touch (minimal set)
- app/guest/report/page.tsx
- app/cases/new/page.tsx
- app/cases/[id]/page.tsx (dashboard enhancements)
- components/evidence/EvidenceUploader.tsx
- components/app/chat-workbench.tsx
- components/case/SwarmLogPanel.tsx
- lib/agents/intake/runner.ts or new conversational wrapper if needed
- (Add minimal new components only if reuse insufficient)

## Success Criteria
- Guest flow feels guided and conversational (user completes with AI help).
- Upload shows immediate useful feedback (not just "uploaded").
- Activity log is clear and builds trust.
- No regression on consent, state machine, or verification logic.
- Aligns with Unhold principles: user control, evidence focus, AI as tool not replacement.

This skill can be invoked by referencing it in future PLANNER or IMPLEMENTER turns for UX work. Update this file as features evolve.