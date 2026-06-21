#!/usr/bin/env bash
# Set git identity to project owner (local repo only).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRAND="$ROOT/config/public-brand.json"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }
}

require_cmd jq
require_cmd git

OWNER_NAME="$(jq -r '.owner.name' "$BRAND")"
OWNER_EMAIL="$(jq -r '.owner.email' "$BRAND")"

cd "$ROOT"
git config user.name "$OWNER_NAME"
git config user.email "$OWNER_EMAIL"

echo "Git identity set:"
echo "  user.name  = $(git config user.name)"
echo "  user.email = $(git config user.email)"