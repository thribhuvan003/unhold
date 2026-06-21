# Frontend Policy — Flexible UI, Stable Logic

**Owner decision:** Ship correct product flows in Phase 1. **Redesign UI/UX later** without breaking backend.

---

## Principle

| Layer | Stability | Phase 1 goal |
|-------|-----------|----------------|
| `lib/`, `app/api/`, `supabase/` | **Frozen** per slice spec | Correct data + state machine |
| `components/`, `app/**/*.tsx` pages | **Flexible** | Working flows, basic a11y |
| `lib/ui/tokens.ts`, `app/globals.css` | **Swappable** | Tokens only — change fonts/colors anytime |

Claude and FRONTEND_ENGINEER must **not** block slices on visual polish, animations, or brand perfection.

---

## What must not change when restyling UI

1. API contracts (`/api/v1/*`) and Zod schemas
2. State machine — status changes only via `POST .../transitions`
3. Copy-only letters — no auto-send to bank
4. Disclaimer blocks A–H text (wording from `lib/constants/disclaimers.ts`)
5. Proof gates in escalation UI
6. Guest auth via `GUEST_JWT_SECRET` — not Supabase anon
7. Money as paise — display via `MoneyDisplay`
8. `NextStepsCard` as primary widget on case detail (layout can change, role cannot)

---

## What CAN change freely (later passes)

- Fonts, colors, spacing, motion, illustrations
- Component file structure under `components/`
- Tailwind classes, shadcn adoption, dark mode
- Page layout and marketing copy on `/` and `/guest/report`
- Animation libraries (add when ready — not Phase 1 gate)

---

## File conventions

```
components/
  case/          # Case dashboard widgets — props-driven, no direct DB
  evidence/      # Upload UX
  escalations/   # Mark-sent forms
  letters/       # Preview only
  legal/         # Consent modals
  ops/           # Operator queue
  ui/            # Primitives (MoneyDisplay, buttons later)

lib/ui/tokens.ts   # Single source for color/spacing/type scale
app/globals.css    # CSS variables — import tokens
```

**Rule:** Pages fetch via API or server components; components receive **typed props**, not raw Supabase in client components.

---

## Design tokens (current defaults)

Change these in `lib/ui/tokens.ts` + `:root` in `globals.css` — not scattered in components.

| Token | Default | Purpose |
|-------|---------|---------|
| navy | `#0B1F33` | Text, header |
| primary | `#1F6B8A` | Links, secondary actions |
| accent | `#E67E00` | Primary CTA |
| font sans | IBM Plex Sans | Body (swap later) |

---

## FRONTEND_ENGINEER review focus

- [ ] 44px touch targets on mobile actions
- [ ] Guest flow without Supabase login
- [ ] No secrets in client components
- [ ] Realtime/poll on `user_actions`
- [ ] Escalation UI cannot bypass proof gates
- [ ] **Skip:** pixel-perfect design, Lottie, custom fonts unless user asks

---

## Phase 2+ UI work (explicitly deferred)

- Full design system / shadcn theme
- Page transitions and micro-interactions
- Hindi/i18n (`next-intl` wired in package.json, not required Phase 1)
- Marketing site and SEO pages

When user says "make UI perfect" — treat as **new slice or post-Phase-1 project**, not a harness blocker.