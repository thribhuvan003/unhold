# Changelog

All notable product changes are documented here. The project follows a pre-1.0, date-based release cadence.

## Unreleased

### Security

- Moved application data access behind explicit server authorisation and removed direct browser table/RPC grants.
- Added profile-role escalation defence, invoker-security views, rate limiting, replay protection, and redacted provider logs.
- Removed a tracked deployment-value file and added current-tree secret scanning.

### Reliability

- Added bounded queue retries, real monitor/escalator dispatch, production build CI, and mobile browser smoke tests.

### Experience

- Simplified the worked example, made long letters progressive-disclosure, and improved mobile touch targets.

## 0.1.0 - 2026-07-14

- Public beta foundation: guided intake, evidence handling, case dashboard, draft ladder, proof gates,
  monitoring, data export/erasure, English/Hindi UI, and private evidence storage.
