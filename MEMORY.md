# Unhold — session memory

## 2026-07-15 — Surgical UX pass (approach 1)

### Decided
- Work only in `D:\unhold-fresh` (clean clone of github.com/thribhuvan003/unhold).
- Scope: remove real-user confusion on critical path; no full redesign; no auto-post to Reddit/X.
- Product promise stays: organise facts/papers + review-before-send drafts; user sends everything; no unfreeze guarantee.
- Letter system stays template + case-aware slots, optional LLM with fallback (do not market as “AI lawyer”).

### Why
- Demo/agents audit showed users can think demo = their case, AI always writes a unique lawyer letter, and skipping AI blocks drafts (false).
- Live site historically over-claimed vs safety contract; copy must match product behaviour before cold traffic.

### Rejected
- Full visual redesign + agent rewrite before launch (too large, delays honest distribution).
- Launch-pack-only without UX fixes (would send confused users into the funnel).
- Auto-posting to Reddit/X without human approval of final text.

### Changes shipped this session
- `messages/en.json` + `messages/hi.json`: home steps, intake hints, consent AI-skip truth, demo truth block, letter unlock copy, package/authority framing, draft-loading jargon.
- `app/[locale]/demo/page.tsx`: “truth” list so demo is not misleading.
- `RequestDraft` / `DraftPendingRefresh`: use i18n; honest “preparing draft” language.
- Papers page: use translation keys instead of hardcoded English.

### Next session priorities
- Deploy to unhold.live after review.
- User-approved Reddit/X posts only.
- Optional: e2e smoke after deploy; screenshot refresh under `docs/screenshots`.
