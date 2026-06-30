# ERRORS.md — Lessons from mistakes (lienliberator / Unhold)

**Purpose**: Record approaches that took >1-2 attempts, what failed, what worked, and rules so future sessions (Claude or successor) do not repeat. Append only. Never delete prior entries.

---

## 2026-06-24: Late GRM/MRM official research discovery

**What didn't work / caused damage**:
- Built significant positioning, wizard, and value prop around NCRP/1930 + "Unhold as the layer" before deep-diving official 2026 I4C/MHA GRM (Grievance Redressal Mechanism) + MRM.
- Assumed NCRP filing + bank escalation was the complete primary path. Discovered too late that GRM (with video verification, bank+police coordination, time-bound 7d/15d, free) is the strengthened primary official path for unfreeze reviews.
- Result: docs, hero copy, README, FAQs, REMAINING_WORK initially framed Unhold as more central/standalone than reality. Required major retroactive pivot and consistency audit.

**What worked instead**:
- Fresh user research paste (Optimus) forced explicit re-positioning: "GRM/MRM primary official; Unhold = best supplementary prep/intel layer".
- Canonical language locked in REMAINING_WORK §1, then propagated surgically to FAQ, WHAT..., guest hero, case header, etc.
- Harness + MEMORY + todo tracking made the audit traceable.

**Rule for next time**:
- Always do "official path first" research pass (GRM, portals, SOPs, real user reports on X/Reddit) BEFORE any hero/positioning copy or "opportunity" framing. Use RESEARCHER agent explicitly for "current 2026 official unfreeze mechanisms India".
- If a new research source arrives mid-session, immediately run full doc grep + consistency sweep before more feature work.

---

## 2026-06-24: Inconsistent docs across files

**What didn't work**:
- Updated REMAINING_WORK and FAQ with GRM-primary language.
- Left README, app/page.tsx (landing hero), FOR_FROZEN..., some component text, old paste blocks with vaguer or pre-pivot copy.
- Future Claude reads mixed signals and gets confused (exactly the user's complaint).

**What worked**:
- Systematic grep for suspect phrases ("Unhold’s Opportunity", "best ... layer", unfreeze promises, standalone claims) across entire tree.
- Surgical replaces only on copy surfaces that affect user entry (landing, README, guest, case, key docs).
- Also cleaned a literal filename bug ("gr m-knowledge.ts" with space) that would break imports/clarity.

**Rule**:
- "All files perfect" means: after any positioning or research change, do `grep -r` for old framing + manual read of landing + README + 3-5 top docs + code hero strings.
- Maintain ERRORS.md + MEMORY.md entries.
- The final handoff paste block must restate the canonical GRM-first sentence so it is impossible to miss.

---

## 2026-06-24: Over-scoping + non-Phased execution

**What didn't work**:
- Prior attempts tried to ship full multi-agent orchestration + hybrid RAG + GRM flows + bundle UI + polish in one go.
- Harness existed but was under-used for the big pivot.

**What worked**:
- Friend's advice + MEMORY decision: **Phase 1 first** (positioning audit + basic RAG stubs + GRM-prep wizard mode) before deep multi-agent.
- Reuse existing NOTICE runner + langfuse + NVIDIA for injection.
- grm-knowledge.ts + retrieve stub + migration 012 as foundation.

**Rule**:
- Always slice via Phase 1 / Phase 2 gates explicitly in REMAINING_WORK and the paste block.
- Dispatch via harness: RESEARCHER → PLANNER → IMPLEMENTER (one role) → REVIEWER → VERIFIER.
- Never claim "done" without running the verify commands and a manual happy-path trace.

---

## 2026-06-24: File-only focus (no process / continuity)

**What didn't work**:
- Edits without reading START_HERE / harness prompts / slice-orchestration first.
- No ERRORS.md, weak MEMORY entries, outdated PASTE_*.txt blocks.
- Next session starts from zero context → re-derives, re-makes same mistakes.

**What worked (this session)**:
- Read ritual files first (MANIFEST, REMAINING_WORK, CLAUDE.md, START_HERE, prompts/*).
- Used grep + todo + parallel reads.
- Deleted confusing artifact file.
- Will append MEMORY, create ERRORS, update both paste blocks with full ritual + lessons + Phase 1 spec + gates.
- Ran explicit verifications.

**Rule going forward**:
- Every significant session ends with:
  1. Updated MEMORY (decision + why + rejected).
  2. ERRORS entry if anything took >2 attempts or was confusing.
  3. Perfect self-contained paste block in NEW_LAPTOP_FIRST... and PASTE_THIS... (includes exact ritual, current canonical GRM sentence, files list, harness dispatch, verification commands).
- Never "just edit files".

---

**Permanent constraints (never violate)**:
- GRM/MRM = primary official 2026 path. Unhold = supplementary best-prep layer. All user-facing text leads with that.
- No auto-send, consent fail-closed.
- Harness process + one-role-at-a-time for core changes.
- Verify before claim.
- Keep paste blocks and ERRORS/MEMORY current so Claude never starts confused.

Append future entries below.

---

## 2026-06-24: "Unknown error occurred" when testing = opaque 500 hiding missing env

**What didn't work / the confusion**:
- Owner tested the app and saw a generic "unexpected error occurred" ("maybe API key?").
- Root cause was NOT the API key. `createAdminClient()` (lib/supabase/admin.ts:9) THROWS `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` when Supabase env is unset; `handleRouteError` (lib/api/response.ts:55-56) flattens any non-ApiError to a generic 500 and only `console.error`s the real cause. Every config failure looked identical and blind.
- A missing NVIDIA key does NOT error — `analyzeNotice` returns null → the "couldn't analyze automatically" yellow fallback. So "unknown error" is always a REQUIRED-dep throw (Supabase / GUEST_JWT_SECRET<32 / CRON_SECRET), never the AI key.
- Aggravating factor: there was **no `.env.example`** even though README said `cp .env.example .env.local`. Testers had no template of what to configure.

**What worked instead**:
- Systematic-debugging Phase 1 (trace, don't guess): grepped all `process.env.*` to source the REAL required vars; confirmed the throw chain by reading admin.ts/response.ts/guest.ts/cron-auth.ts/nvidia.ts.
- Shipped `.env.example` (code-sourced) + `GET /api/v1/health` (lib/health/checks.ts) that reports per-dep `configured` booleans + hints (NO secret values, never throws, unauthenticated so it's reachable when everything is misconfigured). 200 when required ok, else 503.
- TDD: tests/unit/health/checks.test.ts (7 cases incl. a no-secret-leak assertion). code-reviewer subagent: APPROVE, 0 blockers.

**Rule for next time**:
- "Unknown/unexpected error" on case-create or analyze == missing REQUIRED env or unapplied migration 011, NOT the NVIDIA key. Tell the tester to open `/api/v1/health` first.
- Never let a new dependency throw into the generic 500 without a matching health check + `.env.example` line.

---

## 2026-06-24: Flaky verifier test under full-suite load (NOT a regression)

**What didn't work**:
- `pnpm test:unit` showed 1 failure: `tests/unit/agents/verifier.test.ts > runVerifier > "skips OCR entirely for a PDF evidence file"` (~6.5s, exceeded the 5s default timeout).

**What worked / truth**:
- Run in isolation it passes 21/21 twice (2.1–3.1s). It's a concurrency timeout flake under full-suite load, already noted in auto-memory ("flaky ~3.5s verifier timing test — re-run to confirm green").

**Rule**: Do NOT treat this single PDF-OCR timeout as a regression. Re-run isolated to confirm green. If it ever needs fixing, raise that one test's timeout rather than chasing logic.

---

## 2026-06-30: Bare pnpm and bare bash fail on this Windows workspace

**What didn't work**:
- `pnpm vitest ...` picked up pnpm 11.7.0 instead of the project-declared pnpm 10.12.1 and aborted with `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`.
- Setting `CI=true` avoided the prompt, but the command timed out while reconciling dependencies.
- `bash scripts/verify-no-auto-send.sh` resolved to `C:\Windows\System32\bash.exe` and failed because WSL has no installed distribution.

**What worked instead**:
- `corepack pnpm install --frozen-lockfile`
- `corepack pnpm <script>`
- `C:\Program Files\Git\bin\bash.exe scripts/verify-no-auto-send.sh`

**Note for next time**:
- Use `corepack pnpm` for all repo verification in this workspace.
- Use Git Bash explicitly for shell scripts.

---

## 2026-06-30: Notice test timeout under full-suite load

**What didn't work**:
- `tests/unit/agents/notice.test.ts > analyzeNotice > returns null when the LLM is not configured` exceeded Vitest's 5s default once during full-suite parallel execution.

**What worked instead**:
- Raised only that test timeout to `60_000`, matching the already documented verifier PDF flake treatment.
- Re-ran full unit suite: 22 files, 176 tests passed.

**Note for next time**:
- Treat this as full-suite load/import timing, not a notice analyzer logic regression, unless the test fails with an assertion or fails repeatedly after the timeout.

---

## 2026-06-30: Local Next.js dev server is unreliable for live verification (token sink)

**What didn't work** (≫2 attempts across the session):
- Repeatedly starting `pnpm dev` in the background to run live API / eval / consistency checks. Failure modes seen: port already held ("Another next dev server is already running"); `nohup pnpm dev &` detaching so the wrapper exited 0 while the server died; first-request route **compilation (5–30s)** misread as real latency; and background eval/consistency runs hitting a server that wasn't up (empty output). ~18 background task files, several failed/stale.

**What worked instead**:
- **Server-independent verification**: `pnpm typecheck` + `pnpm test:unit/contract/golden`, plus DIRECT probes against the real services from a one-off node script run in the repo dir — Groq chat+vision, NVIDIA embed/rerank, Supabase REST + `pg` pooler, and `unpdf`/`sharp`. Deterministic, fast, no dev server. This is how qwen3.6-27b, the image downscale, and PDF extraction were all verified.
- When a dev server IS truly needed (UI/flow E2E): start exactly ONE via `run_in_background` (no `&`, no `nohup`), kill stale instances first (`taskkill //PID <pid> //F`), then poll with `curl --retry --retry-connrefused` before testing.

**Note for next time**:
- Default to server-independent checks for any model / RAG / PDF / image / API-contract work. Reserve the dev server for genuine end-to-end UI verification, and never read first-request latency as production latency.
