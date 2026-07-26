# Changelog

Notable product changes. Pre-1.0; cadence is date-based rather than SemVer guarantees.

## Unreleased

### Performance

- Browser-side photo compression before upload; confirm no longer blocks on OCR.
- Vision path: long-edge 1280 JPEG, HEIC/WebP normalisation, JSON mode, bounded provider timeouts.
- Job drain on enqueue + HTTP wake of `/api/v1/internal/jobs/process` (in addition to 5-minute Actions cron).
- `/healthz` and `/health` rewrite in `proxy.ts` before locale middleware (uptime JSON, not soft 404).
- Reduced Google font weights for mobile first paint.

### Security

- Application data only via authorised server routes; no direct browser table/RPC grants.
- Profile-role escalation defence, invoker-security views, rate limiting, replay protection, redacted provider logs.
- Current-tree secret scanning in CI; removed tracked deployment-value material.

### Reliability

- Bounded queue retries, monitor/escalator dispatch, production build in CI, mobile browser smoke tests.
- Transient read retries on the case page so brief network blips do not hard-fail the workspace.

### Experience

- Clearer worked example and progressive disclosure on long drafts.
- Mobile touch targets and copy aligned with the product/safety contract.

## 0.1.0 — 2026-07-14

Public beta foundation: guided intake, evidence handling, case dashboard, draft ladder, proof gates, monitoring, data export/erasure, English/Hindi UI, private evidence storage.
