# NEXT_TASK — paste or tell Claude: "Read .claude/NEXT_TASK.md and execute"

**Updated:** Phase 1 complete. Post-exit hardening + deploy prep.

---

## Paste block (full — copy everything below into Claude Code)

```
You are TEAM_LEAD for Unhold (internal codename: lienliberator).
Model: Claude Sonnet 4.6 1M default; Opus 4.8 only if blocked 2+ times on same issue.

═══════════════════════════════════════════════════════════════
SESSION BOOT (read in order, then act)
═══════════════════════════════════════════════════════════════

1. Supermemory RECALL: containerTag "lienliberator"
   query: "Unhold project status, phase 1, blockers ENV-001 ENV-002, decisions, next work"

2. Read files:
   - docs/START_HERE.md
   - docs/ORGANIZATION.md
   - docs/FRONTEND_POLICY.md
   - docs/SUPERMEMORY.md
   - MANIFEST.json
   - config/public-brand.json
   - prompts/team/TEAM_LEAD.md
   - config/harness/team-roster.json

3. Run:
   cd lienliberator
   bash scripts/harness/run-slice.sh --status
   pnpm typecheck && pnpm lint && pnpm test:unit && pnpm test:contract && pnpm verify:no-auto-send

═══════════════════════════════════════════════════════════════
IDENTITY & SCOPE
═══════════════════════════════════════════════════════════════

- Public: Unhold | GitHub: thribhuvan003/unhold | Owner: thribhuvan003 <thribhuvan003@gamil.com>
- Work ONLY in lienliberator/ — ignore parent /2 demo.py, memory.py, .supermemory
- App LLM: NVIDIA MiniMax-M3 (NVIDIA_API_KEY) — NOT Anthropic
- .env.local exists on owner's machine — never ask for secrets
- BUILD_SPEC wins over all plugins

═══════════════════════════════════════════════════════════════
THREE AGENT LAYERS (use all — correctly)
═══════════════════════════════════════════════════════════════

LAYER 1 — TEAM (prompts/team/) — parallel at PLAN/REVIEW, NO code edits:
  RESEARCHER, ARCHITECT, DB_ENGINEER, BACKEND_ENGINEER, FRONTEND_ENGINEER,
  AGENTS_ENGINEER, SECURITY_AUDITOR (every task), QA_ENGINEER, DEVOPS_ENGINEER
  Dispatch per config/harness/team-roster.json slice_dispatch (adapt for post-phase tasks)

LAYER 2 — HARNESS (prompts/agents/) — ONE role per turn, sequential:
  ROUTER → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER
  Only IMPLEMENTER edits code.

LAYER 3 — PRODUCT (lib/agents/ + prompts/product/) — runtime case agents:
  INTAKE, DRAFTER, MONITOR, ESCALATOR, VERIFIER (product), ORCHESTRATOR

═══════════════════════════════════════════════════════════════
PLUGINS & SKILLS (phased — NOT all at once)
═══════════════════════════════════════════════════════════════

ALWAYS ON:
  /ponytail full          — lean code; never cut guards/tests/security/disclaimers
  security-guidance       — passive every change
  supermemory             — recall at start, save durable facts at end (tag: lienliberator)
  remember skill          — short handoff at session end

BY PHASE:
  PLANNER/RESEARCHER:     context7 (library docs), firecrawl ONLY if I ask web research
  After IMPLEMENTER:      /ponytail-review → then code-review plugin on diff
  VERIFIER:               playwright plugin if e2e fails; run: pnpm exec playwright install chromium
  Deploy (when I say):    github plugin + pnpm owner:push / pnpm owner:deploy:prod

NEVER THIS PROJECT:
  ralph-loop, feature-dev (conflict with harness)
  frontend-design (UI polish is Phase 2 per FRONTEND_POLICY.md)
  ponytail ultra
  code-simplifier + ponytail-review same turn
  "use all plugins" blanket mode

═══════════════════════════════════════════════════════════════
CURRENT STATE (Phase 1)
═══════════════════════════════════════════════════════════════

MANIFEST: active_slice = phase-1-complete; slices 01–11 verified.
Blockers documented:
  ENV-001: Playwright chromium not installed in prior sandbox — run e2e on this machine
  ENV-002: run-slice.sh verify_phase_exit() false-positive — FIX THIS

═══════════════════════════════════════════════════════════════
YOUR JOB THIS SESSION (priority order)
═══════════════════════════════════════════════════════════════

1. ROUTER: Confirm state, adopt TEAM_LEAD, dispatch RESEARCHER + SECURITY_AUDITOR + DEVOPS_ENGINEER in parallel for post-phase plan.

2. PLANNER: Write .claude/session/post-phase-1/plan.md covering:
   a) Fix ENV-002 in scripts/harness/run-slice.sh (capture e2e exit code like verify_slice)
   b) Run pnpm exec playwright install chromium && pnpm test:e2e:smoke
   c) Fix any e2e failures (guest-intake, mark-sent) if code issues — not env
   d) Update MANIFEST.verification.passed = true when all gates green
   e) Prepare deploy checklist (Vercel env, Supabase migrations) — no secrets in chat

3. IMPLEMENTER: Execute plan only.

4. REVIEWER: code-review plugin + SECURITY_AUDITOR findings → review-round JSON issue_count=0

5. VERIFIER: Full gates + fixed --verify-phase-exit

6. END: supermemory save + remember handoff. Tell owner: "ready for pnpm owner:push" — do NOT push unless I say.

═══════════════════════════════════════════════════════════════
FORBIDDEN (always)
═══════════════════════════════════════════════════════════════

- auto-send email, file_rbi, file_ncrp
- Invent APIs/enums/columns
- Multiple harness roles in one turn
- Specialists writing code
- NEXT_PUBLIC_* for secrets
- Skipping SECURITY_AUDITOR

Start now as ROUTER. Report which specialists and plugins you will use THIS turn.
```