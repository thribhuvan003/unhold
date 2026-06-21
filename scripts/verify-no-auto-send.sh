#!/usr/bin/env bash
set -euo pipefail
if rg -n "send_email|file_rbi|file_ncrp|autoSend|auto_send|resend\.emails\.send" app/ lib/ --glob '!**/*.test.*' 2>/dev/null; then
  echo "FAIL: auto-send patterns found"
  exit 1
fi
if rg -n "ESCALATION_L[0-9]|DRAFT|CLASSIFIED|INTAKE_COMPLETE" app/ lib/ --glob '!**/*.test.*' 2>/dev/null; then
  echo "FAIL: legacy state enum names found"
  exit 1
fi
if rg -n "NEXT_PUBLIC.*SERVICE_ROLE|NEXT_PUBLIC.*CRON_SECRET" app/ lib/ 2>/dev/null; then
  echo "FAIL: secrets exposed to client"
  exit 1
fi
echo "OK: no auto-send / legacy enums / leaked secrets"