# Supermemory — persistent memory for this project

Every Claude session has **long-term memory** via the Supermemory MCP server.
Use it so knowledge carries across sessions instead of being re-derived each time.

## The one rule

**Always use container tag `lienliberator`** for every memory call in this repo.
This keeps LienLiberator's memory isolated from other projects. Do not use the
raw working-directory path — use the literal string `lienliberator`.

## Tools (MCP server `supermemory`)

| Tool | Purpose | Key args |
|------|---------|----------|
| `mcp__supermemory__recall` | Search/retrieve past memory | `query`, `containerTag:"lienliberator"` |
| `mcp__supermemory__memory` | Save a durable memory | `content`, `containerTag:"lienliberator"` |

`recall` also accepts `includeProfile`. `memory` accepts an `action` arg — omit
it to add (the default).

## When to RECALL (read)

Call `recall` early — before planning or writing code — whenever prior context
could matter:

- At the **start of a task or session**, recall the project state and any open
  decisions: `recall(query="LienLiberator current status, architecture, open decisions", containerTag="lienliberator")`.
- Before touching a subsystem, recall what's known about it:
  `recall(query="how does the harness build loop work", containerTag="lienliberator")`.
- When a choice feels familiar ("didn't we decide this?"), recall first instead
  of re-deciding.

Feed the returned snippets into your reasoning before answering.

## When to SAVE (write)

Call `memory` when you learn something **durable** — true beyond this one turn:

- **Decisions:** "We chose Supabase + Postgres for storage because …"
- **Conventions:** "Slices are tracked in MANIFEST.json; one role per harness turn."
- **Gotchas / fixes:** "pnpm-lock must be regenerated after editing package.json or CI fails."
- **User preferences:** "User wants concise answers and per-project memory isolation."
- **Architecture facts:** "Three prompt layers: team / agents / product (see prompts/README.md)."
- **State at session end:** what was completed, what's next.

Write one clear fact per call. Example:

```
memory(
  content="LienLiberator uses the harness build loop: TEAM_LEAD → specialists → PLANNER → IMPLEMENTER → REVIEWER → VERIFIER, one role per turn.",
  containerTag="lienliberator"
)
```

## What NOT to save

- Secrets, API keys, tokens, credentials.
- Transient chatter, raw file dumps, or anything already in the repo/git history
  (recall the code instead).
- Speculation — only save things you've verified.

## Good loop per session

1. **Recall** relevant memory for the task (`containerTag:"lienliberator"`).
2. Do the work, informed by what you recalled.
3. **Save** any new durable decisions, conventions, or gotchas.
4. At session end, save a short "what's done / what's next" note.

## Gotchas

- **Indexing delay (~10s):** a memory you just saved isn't instantly recallable.
  Don't save-then-immediately-recall the same fact in one breath.
- **Memory is retrieval, not infinite context:** it doesn't auto-load into every
  prompt. You must call `recall` to pull it in, and `memory` to store it.
- **Tag discipline is everything:** a typo in `containerTag` silently splits the
  project's memory. Always exactly `lienliberator`.
- If the `supermemory` MCP server isn't connected (`/mcp` shows it down), memory
  calls will fail — proceed without it and mention it.
