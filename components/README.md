# Components — Presentation Layer

**Flexible.** Backend and API contracts are stable; this folder can be restyled anytime.

## Rules

1. **Props in, UI out** — no `createAdminClient()` in client components
2. **No case status mutations** — call API routes only
3. **Money** — use `components/ui/MoneyDisplay.tsx` (paise → en-IN)
4. **Tokens** — prefer `lib/ui/tokens.ts` for colors/fonts

## Folders

| Folder | Purpose |
|--------|---------|
| `case/` | NextStepsCard (primary), ActionInbox, SwarmLogPanel |
| `evidence/` | EvidenceUploader |
| `escalations/` | MarkSentForm + proof UX |
| `letters/` | LetterPreview — copy only, no send |
| `legal/` | DisclaimerModal, ConsentCheckbox |
| `ops/` | QueueTable |
| `ui/` | Shared primitives |

## Policy

`docs/FRONTEND_POLICY.md` — Phase 1 = flows correct, not pixel-perfect.