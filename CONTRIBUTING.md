# Contributing

Unhold handles sensitive financial-case information. Changes should make the workflow safer, clearer, or
more reliable without implying a legal outcome.

## Development

1. Create a branch from the latest `main`.
2. Copy `.env.example` to `.env.local` and use local/test credentials only.
3. Install with `pnpm install --frozen-lockfile`.
4. Keep browser code away from service-role credentials and application-table access.
5. Add focused tests for every behaviour change.
6. Run `pnpm verify` and `pnpm test:e2e:smoke` before requesting review.

## Pull requests

Explain the user problem, the safety impact, verification evidence, and any deployment or migration order.
Do not include real user documents, account identifiers, phone numbers, tokens, provider response bodies,
or filled environment files. UI changes should be checked at a Pixel-sized viewport and with keyboard-only
navigation. Database migrations must be forward-only, reproducible, and reviewed before production use.

Product language must follow [`docs/PRODUCT_AND_SAFETY.md`](docs/PRODUCT_AND_SAFETY.md).
