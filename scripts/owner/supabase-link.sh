#!/usr/bin/env bash
# Link local Supabase CLI to the public project slug (unhold).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRAND="$ROOT/config/public-brand.json"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }
}

require_cmd jq

SLUG="$(jq -r '.supabase_project_slug' "$BRAND")"
REF="${1:-}"

cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1; then
  echo "Install Supabase CLI: pnpm exec supabase --help" >&2
  exit 1
fi

if [[ -z "$REF" ]]; then
  echo "Usage: bash scripts/owner/supabase-link.sh <project-ref>"
  echo "Create project in Supabase dashboard with display name/slug: $SLUG"
  exit 1
fi

supabase link --project-ref "$REF"
echo "Linked Supabase project $REF (slug: $SLUG)"