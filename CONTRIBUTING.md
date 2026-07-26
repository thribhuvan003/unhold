# Contributing

Unhold holds sensitive case material. Prefer changes that make the workflow **safer, clearer, or more reliable** — without implying a legal outcome or unfreeze guarantee.

## Development

1. Branch from current `main`.
2. Copy `.env.example` → `.env.local` (local/test credentials only).
3. `pnpm install --frozen-lockfile`
4. Keep service-role keys and application-table access off the browser bundle.
5. Add focused tests for behaviour you change.
6. Run `pnpm verify` and `pnpm test:e2e:smoke` before opening a PR.

## Pull requests

Include:

- The user problem and the intended behaviour change
- Safety impact (data access, send paths, legal copy)
- How you verified (commands + what you checked in the UI)
- Migration / deploy order if schema or env vars change

Do **not** include real case documents, account numbers, phone numbers, tokens, raw provider bodies, or filled env files.

UI: check a ~390px-wide viewport and keyboard-only navigation.  
SQL: migrations forward-only, reproducible, reviewed before production.

Product wording must match [`docs/PRODUCT_AND_SAFETY.md`](docs/PRODUCT_AND_SAFETY.md).
