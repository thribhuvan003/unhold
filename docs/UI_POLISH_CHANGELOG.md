# UI Polish Changelog — Unhold (LienLiberator)

**Author:** thribhuvan003  
**Date:** 2026-06-23  
**Scope:** Frontend-only — no API, state machine, or harness slice changes.

---

## Summary

Full visual refresh from generic warm-forest/terracotta styling to a **sky blue × cement** civic-tech palette, with distinctive typography and production-grade micro-interactions. Navbar rebuilt with active-route pills, CTA hierarchy, scroll depth, and accessibility fixes verified by a code-reviewer agent.

---

## Design system (`app/globals.css`, `lib/ui/tokens.ts`)

### Palette
| Token | Value | Role |
|-------|-------|------|
| Paper / cement | `#E6E4DE`, `#EDEBE6`, `#F7F6F2` | Page and card surfaces |
| Sky | `#4FA3D4` → `#2B7DAD` | Primary actions, links, progress |
| Cement dark | `#43474D` | Header bar |
| Ink | `#2E3238` | Body text (cool charcoal) |

Legacy CSS variable names (`--forest`, `--terracotta`, etc.) remap to sky/cement so existing components keep working.

### Typography (Google Fonts via `app/layout.tsx`)
| Role | Font |
|------|------|
| Display | **Bricolage Grotesque** (700–800) |
| Body | **Schibsted Grotesk** |
| Data / mono | **Red Hat Mono** |

Utility classes: `.type-eyebrow`, `.type-display`, `.type-display-xl`, `.type-lead`, `.type-caption`, `.type-mono-data`.

### Component primitives
- Surfaces: `.u-card`, `.u-hero`, `.u-paper-grain`
- Forms: `.u-input`, `.u-radio`, `.u-dropzone`
- Actions: `.u-btn-primary` (sky), `.u-btn-secondary` (cement-dark), `.u-btn-ghost`, `.u-btn-warn`
- Motion: `animate-fade-up`, `animate-slide-in`, stagger delays; `prefers-reduced-motion` respected
- Chips, timeline, alerts, letter preview, queue items, progress tracks

### Tailwind v4 fix
Rewrote `globals.css` with `@theme`, `@layer base/components/utilities` so custom classes (`.u-btn-primary`, `.font-display`, CSS variables) compile into the production bundle.

---

## Navbar (`components/layout/SiteHeader.tsx`)

Extracted from `app/layout.tsx` into a client component.

| Feature | Detail |
|---------|--------|
| Segmented pill nav | Frosted capsule with sky-filled active tab |
| Route awareness | Home brand glow; `/guest/*` → Report; `/cases/*` → My cases |
| CTA hierarchy | `u-nav-link-cta` sky tint on “Report freeze” when inactive |
| Scroll shadow | `u-site-header-scrolled` after 8px scroll |
| Sky hairline | Gradient accent under header |
| Mobile | Short labels (“Report” / “Cases”) &lt;380px; logo-only &lt;384px |
| Accessibility | Skip link → `#main-content`, `aria-current`, `aria-label` on brand, **44×44px** touch targets, focus rings |

**Reviewer agent:** Round 1 flagged brand a11y + touch target → fixed → Round 2 **approved**.

---

## Pages

| Page | Changes |
|------|---------|
| `/` | Hero with type scale, feature cards with icon hover scale |
| `/guest/report` | Guided intake stepper, chips, radio cards |
| `/cases` | Pipeline cards, evidence readiness bars, skeletons |
| `/cases/[id]` | CaseSection layout, NextStepsCard, EvidenceUploader, tabs |

---

## Components polished

- `GuidedIntakeForm` — step chips, progress track, recap eyebrows
- `EvidenceUploader` — dropzone, verification progress animation
- `SwarmLogPanel` — timeline rails, date grouping, hover slide
- `NextStepsCard` — sky-deep gradient hero, live dot, Mark done CTA
- `ActionInbox` — queue list styling
- `CaseDetailTabs` — tab indicator animation
- `MarkSentForm` / `LetterPreview` — design system (removed inline slate/teal styles)
- `DisclaimerModal` / `ConsentCheckbox` — token-aligned
- UI primitives: `Button`, `Card`, `Badge`, `MoneyDisplay`, `CaseSection`

---

## Tests added / updated

| File | Coverage |
|------|----------|
| `tests/unit/components/SiteHeader.test.tsx` | Active routes, CTA, skip link, short labels (5 tests) |
| `tests/e2e/visual-audit.spec.ts` | Screenshots for `/`, `/guest/report`, `/cases` |
| Existing component tests | NextStepsCard, GuidedIntakeForm, EvidenceUploader, SwarmLogPanel, CasesPage |

**150 unit tests passing** after all changes.

---

## Files touched (this polish pass)

```
app/globals.css
app/layout.tsx
app/page.tsx
app/cases/page.tsx
app/cases/[id]/page.tsx
app/cases/new/page.tsx
app/guest/report/page.tsx
components/layout/SiteHeader.tsx
components/case/*
components/intake/GuidedIntakeForm.tsx
components/evidence/EvidenceUploader.tsx
components/escalations/MarkSentForm.tsx
components/letters/LetterPreview.tsx
components/legal/*
components/ui/*
lib/ui/tokens.ts
lib/ui/cn.ts
tests/unit/components/SiteHeader.test.tsx
tests/e2e/visual-audit.spec.ts
docs/UI_POLISH_CHANGELOG.md
```

---

## Local verification

```bash
cd lienliberator
pnpm dev
# Hard refresh Cmd+Shift+R
open http://localhost:3000
open http://localhost:3000/guest/report
open http://localhost:3000/cases

pnpm typecheck && pnpm test:unit
```

---

## Suggested commit message

```
feat(ui): sky×cement design system, polished navbar, humane typography

- Bricolage Grotesque + Schibsted Grotesk + Red Hat Mono
- SiteHeader with active pills, CTA emphasis, skip link, a11y
- Tailwind v4 @theme CSS compilation fix
- Component polish across intake, evidence, cases, letters
- SiteHeader unit tests + visual audit spec
```