#!/usr/bin/env bash
# Commit (optional) and push as thribhuvan003 — no other contributor identity.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BRAND="$ROOT/config/public-brand.json"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing: $1" >&2; exit 1; }
}

require_cmd jq
require_cmd git

bash "$ROOT/scripts/owner/git-config.sh"

cd "$ROOT"

GITHUB_FULL="$(jq -r '.github_full' "$BRAND")"
REMOTE_URL="https://github.com/${GITHUB_FULL}.git"

if ! git remote get-url origin >/dev/null 2>&1; then
  git remote add origin "$REMOTE_URL"
  echo "Added origin → $REMOTE_URL"
else
  git remote set-url origin "$REMOTE_URL"
fi

BRANCH="${1:-main}"
MESSAGE="${2:-}"

if [[ -n "$MESSAGE" ]]; then
  AUTHOR="$(jq -r '.owner.name' "$BRAND") <$(jq -r '.owner.email' "$BRAND")>"
  git add -A
  git commit -m "$MESSAGE" --author="$AUTHOR"
fi

git push -u origin "$BRANCH"
echo "Pushed to origin/$BRANCH as $(jq -r '.owner.name' "$BRAND")"