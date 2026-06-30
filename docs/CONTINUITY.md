# Continuity & Laptop Migration Guide

**Goal**: Any AI (Grok, Claude, etc.) opening this repo on a new machine or new terminal must be able to continue work immediately by reading files — without needing the full previous conversation.

## On opening the project (new terminal / new laptop)

Run these commands and read the output:

```bash
cd lienliberator

# 1. Rules + identity
cat docs/START_HERE.md | head -80

# 2. Current state
cat MANIFEST.json

# 3. Everything that is left (the master list)
cat docs/REMAINING_WORK.md

# 4. Human + AI quickstart
cat README.md

# 5. AI session entry
cat .claude/SESSION_START.md

# 6. Harness status
bash scripts/harness/run-slice.sh --status
```

Then recall long-term memory:
- Use Supermemory MCP with `containerTag: "lienliberator"`
- Query examples: "active slice and open UX gaps", "harness rules", "why use Unhold for frozen users"

## Required files that must always be up-to-date

These files contain the persistent context:

1. `docs/START_HERE.md` — Team Lead contract, rules, startup checklist
2. `MANIFEST.json` — Slice progress, active_slice, harness_state, decisions, blockers
3. `docs/REMAINING_WORK.md` — All remaining work for real users (UX + slices + infra + pitch + objection handling)
4. `README.md` — Public description + "For AI continuing" section
5. `.claude/SESSION_START.md` — Exact instructions for new AIs
6. `.claude/session/{active-or-last}/handoff.md` — What was done, open issues, next step
7. `docs/CONTINUITY.md` (this file)
8. `.env.example` — Real environment setup for laptop/prod

Secondary but important:
- `config/harness/slice-orchestration.json`
- `docs/SUPERMEMORY.md`
- `docs/BUILD_SPEC*.md` (read sections only as referenced)
- Previous slice handoffs/summaries in `.claude/session/`

## When moving to a new laptop (Practical steps)

**Best and safest way:**

1. Copy the entire `lienliberator/` folder to your new laptop (you can send the zip or rsync it).
2. On the new laptop:
   - Do **not** copy `node_modules/` — run `pnpm install` instead.
   - Manually copy your real `.env.local` (or re-create from `.env.example` + your secrets). Never commit real secrets.
   - If you were using git, either `git clone` fresh or copy the `.git` folder carefully.
3. In Supabase (if using a new/local instance):
   - Create project (if new)
   - Apply migrations if needed
   - Manually create storage buckets: `evidence` and `bundles`
   - Set up RLS / policies as before
4. Run the "on opening" ritual (see below).
5. Recall Supermemory with containerTag `lienliberator`.

**For Grok chat history / session:**
- Your current Grok session ID is `019ee99b-fdfb-77d3-bf34-967adfbffc8d`
- The full path on this machine is `~/.grok/sessions/%2FUsers%2Fnirupamagr%2F2/019ee99b-fdfb-77d3-bf34-967adfbffc8d`
- You can copy this folder to the new laptop's `~/.grok/sessions/` (you may need to adjust the encoded path to match the new workspace location, e.g. your new username).
- Note: Chat sessions are local. The project files (especially the docs we created) are more important for actual continuity.

**Quick recommendation:**
- Send the `lienliberator/` folder (or the whole parent folder if you want).
- On new laptop, after copying: delete `node_modules` if it came over, then `pnpm install`.
- Then immediately run the ritual commands above. This is why we spent time putting everything in docs/.

**Recommended first commands on new laptop:**
```bash
cd lienliberator   # or the correct subpath like 2/lienliberator if structured that way
cat docs/START_HERE.md | head -50
cat MANIFEST.json
cat docs/CONTINUITY.md
cat docs/REMAINING_WORK.md
bash scripts/harness/run-slice.sh --status
pnpm install
```

**For Claude on new laptop (full setup with Supermemory + continuing dev on research):**

1. Copy the folder as above.

2. Open in your Claude interface (recommended: Claude Code extension in VSCode or Cursor for full /commands, dispatching, and agent features, or claude.ai project).

3. Every session, run the ritual above.

4. **Supermemory / Memory:**
   - Configure Supermemory MCP if available in Claude settings (tag exactly "lienliberator").
   - At start of tasks: Recall "Unhold current status, June 2026 research synthesis (best deliverable: Unfreeze Wizard with P0 Notice Analyzer + checklist + realtime validation, inspirations from Copperlane/Harvey/TurboTax), remaining work, active plans".
   - Save durable facts/decisions with the tag.
   - If not connected, use "memory" tool or docs (self-contained).

5. Use team prompts (prompts/team/) for parallel specialists (RESEARCHER, FRONTEND etc.).
   Harness: one role per turn (prompts/agents/).

6. Start with the research in mind (integrated in REMAINING_WORK.md).

See docs/SUPERMEMORY.md, docs/START_HERE.md, docs/NEW_LAPTOP_CLAUDE_SETUP.md.

**Ready paste for Claude after ritual (to start work):**
Paste the content of 2/lienliberator/NEW_LAPTOP_FIRST_PASTE_TO_CLAUDE.txt or the one in docs/NEW_LAPTOP_CLAUDE_SETUP.md. It includes the research, synthesized best deliverable, and kicks off RESEARCHER for Notice Analyzer inspirations + agent process.

## Supermemory usage (critical for continuity)

- Always use exactly `containerTag: "lienliberator"`
- Save durable facts only (architecture decisions, user preferences, "what we decided about X", slice status notes)
- Recall at the beginning of tasks
- Do **not** save secrets or transient chat

See `docs/SUPERMEMORY.md` for exact tool usage.

## After finishing any meaningful work

You **must**:
- Update `MANIFEST.json` (slice status, harness_state, verification)
- Write or update handoff in `.claude/session/.../handoff.md`
- Append a short note to `docs/REMAINING_WORK.md` if gaps changed
- Save key facts via Supermemory (`containerTag: "lienliberator"`)
- Commit with clear message scoped to what changed

## What "all info in files and folders" means

We have deliberately moved almost all project memory into these permanent artifacts so future sessions (on laptop, different AI, after long breaks) can reconstruct context without the original chat.

Never treat the current conversation as the only source of truth.

## Quick reference for "what is left"

The authoritative list lives in:
**`docs/REMAINING_WORK.md`**

It covers:
- Why a normal user with frozen money should (or shouldn't) use Unhold
- All UX gaps needed for real use
- Remaining harness slices
- Deploy / infra / env items
- Testing, polish, pitch
- Continuity instructions (this doc)

## Owners & contact

Owner: thribhuvan003  
Public product: Unhold

Keep this document and `docs/REMAINING_WORK.md` accurate. They are the handoff contract for the next person (human or AI) who works on the project.
