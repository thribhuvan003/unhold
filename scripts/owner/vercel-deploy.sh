#!/usr/bin/env bash
# Deploy to Vercel under owner project name (unhold).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRAND="$ROOT/config/public-brand.json"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }
}

require_cmd jq

PROJECT="$(jq -r '.vercel_project' "$BRAND")"
PROD="${1:-}"

cd "$ROOT"

if ! command -v vercel >/dev/null 2>&1; then
  echo "Install Vercel CLI: pnpm add -g vercel" >&2
  exit 1
fi

if [[ "$PROD" == "--prod" ]]; then
  vercel deploy --prod --yes --name "$PROJECT"
else
  vercel deploy --yes --name "$PROJECT"
fi

echo "Deployed project: $PROJECT (owner: $(jq -r '.owner.name' "$BRAND"))"