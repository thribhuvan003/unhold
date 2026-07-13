# Presentation layer

Components render product state and call versioned API routes; they do not use the Supabase service role or
write application tables directly.

## Conventions

- Keep a page's primary action visually dominant and progressively disclose supporting detail.
- Use the shared UI tokens and primitives before adding one-off colours, spacing, or controls.
- Format money from integer paise with `MoneyDisplay`.
- Keep interactive targets at least 44 CSS pixels where layout permits.
- Preserve visible focus, semantic labels, status announcements, and keyboard order.
- Treat every letter as a review-before-send draft; never add a send-to-authority control.
- Test public journeys at desktop and Pixel-sized viewports and run axe checks.

## Folders

| Folder         | Responsibility                                                 |
| -------------- | -------------------------------------------------------------- |
| `case/`        | Case status, next actions, papers, letter ladder, and activity |
| `evidence/`    | Private upload and verification feedback                       |
| `escalations/` | Approval and proof-gated mark-sent interactions                |
| `letters/`     | Concise draft summary and progressive full-letter review       |
| `legal/`       | Disclaimer and consent surfaces                                |
| `ops/`         | Authenticated operations UI                                    |
| `ui/`          | Reusable primitives                                            |

Product language follows [`docs/PRODUCT_AND_SAFETY.md`](../docs/PRODUCT_AND_SAFETY.md).
