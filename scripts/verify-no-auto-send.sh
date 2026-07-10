#!/usr/bin/env bash
set -euo pipefail
if rg -n "send_email|send_sms|file_rbi|file_ncrp|autoSend|auto_send|mark_escalation_sent|resend\.emails\.send" app/ lib/ \
  --glob '!**/*.test.*' \
  --glob '!lib/agents/tools/registry.ts' \
  --glob '!lib/loops/agent-harness.ts' \
  --glob '!lib/loops/dev-loop.ts' 2>/dev/null; then
  echo "FAIL: auto-send patterns found"
  exit 1
fi
if rg -n "ESCALATION_L[0-9]|['\"]DRAFT['\"]|CLASSIFIED|INTAKE_COMPLETE" app/ lib/ --glob '!**/*.test.*' 2>/dev/null; then
  echo "FAIL: legacy state enum names found"
  exit 1
fi
if rg -n "NEXT_PUBLIC_[A-Z0-9_]*(SERVICE_ROLE|CRON_SECRET)" app/ lib/ 2>/dev/null; then
  echo "FAIL: secrets exposed to client"
  exit 1
fi
echo "OK: no auto-send / legacy enums / leaked secrets"
