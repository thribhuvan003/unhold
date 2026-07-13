# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability or include personal case data, credentials,
or exploit details in screenshots. Use GitHub's private vulnerability reporting for
[`thribhuvan003/unhold`](https://github.com/thribhuvan003/unhold/security/advisories/new).

Include the affected route/component, impact, minimum reproduction, and a safe way to validate the fix.
Do not access another person's case, download real evidence, cause a real message/payment, or degrade the
service while testing.

## Scope

The current `main` branch and `https://www.unhold.live` are supported. Third-party provider dashboards,
social engineering, denial-of-service, and reports based only on automated version banners are out of scope.

## Security model

- Browser Supabase access is authentication-only; application data is accessed through authorised server routes.
- Evidence and generated bundles use private storage.
- Guest tokens, cron credentials, service-role keys, and provider credentials are server-only.
- External submissions are review-before-send and never automatic.
- CI runs deterministic tests, production build checks, and current-tree secret scanning.

If a credential may have been exposed, rotate it at the provider first; removing a file or rewriting Git
history does not invalidate the credential.
