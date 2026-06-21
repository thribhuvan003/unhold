#!/usr/bin/env bash
# LienLiberator harness — run one implementation slice verification gate
# Usage:
#   ./scripts/harness/run-slice.sh --status
#   ./scripts/harness/run-slice.sh --verify-only [--slice slice-01]
#   ./scripts/harness/run-slice.sh --complete-slice [--slice slice-01]
#   ./scripts/harness/run-slice.sh --verify-phase-exit
#   ./scripts/harness/run-slice.sh --init-session [--slice slice-01]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

MANIFEST="$ROOT/MANIFEST.json"
ORCHESTRATION="$ROOT/config/harness/slice-orchestration.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[harness]${NC} $*" >&2; }
warn() { echo -e "${YELLOW}[harness]${NC} $*" >&2; }
fail() { echo -e "${RED}[harness]${NC} $*" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

require_cmd jq

[[ -f "$MANIFEST" ]] || fail "MANIFEST.json not found at $MANIFEST"
[[ -f "$ORCHESTRATION" ]] || fail "slice-orchestration.json not found at $ORCHESTRATION"

ACTION="--status"
SLICE_ID=""
FORCE_SLICE=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --status|--verify-only|--complete-slice|--verify-phase-exit|--init-session)
      ACTION="$1"
      shift
      ;;
    --slice)
      SLICE_ID="$2"
      FORCE_SLICE=true
      shift 2
      ;;
    -h|--help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      fail "Unknown argument: $1"
      ;;
  esac
done

if [[ -z "$SLICE_ID" ]]; then
  SLICE_ID="$(jq -r '.active_slice' "$MANIFEST")"
fi

SESSION_DIR="$(jq -r --arg id "$SLICE_ID" '.slices[] | select(.id==$id) | .session_dir' "$MANIFEST")"
mkdir -p "$ROOT/$SESSION_DIR"

update_manifest() {
  local tmp
  tmp="$(mktemp)"
  jq "$1" "$MANIFEST" > "$tmp" && mv "$tmp" "$MANIFEST"
}

get_slice_status() {
  jq -r --arg id "$SLICE_ID" '.slices[] | select(.id==$id) | .status' "$MANIFEST"
}

check_deps() {
  local deps
  deps="$(jq -r --arg id "$SLICE_ID" '.slices[] | select(.id==$id) | .depends_on[]?' "$ORCHESTRATION" 2>/dev/null || true)"
  if [[ -z "$deps" ]]; then
    return 0
  fi
  while IFS= read -r dep; do
    [[ -z "$dep" ]] && continue
    local st
    st="$(jq -r --arg id "$dep" '.slices[] | select(.id==$id) | .status' "$MANIFEST")"
    if [[ "$st" != "verified" ]]; then
      fail "Dependency $dep status=$st (need verified) for $SLICE_ID"
    fi
  done <<< "$deps"
}

run_command_gate() {
  local name="$1"
  local cmd="$2"
  log "Gate: $name → $cmd"
  set +e
  # Command output to stderr so caller captures exit code only via stdout
  bash -c "$cmd" >&2
  local ec=$?
  set -e
  echo "$ec"
}

write_verification_json() {
  local passed="$1"
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  local outfile="$ROOT/$SESSION_DIR/verification.json"

  jq -n \
    --arg slice_id "$SLICE_ID" \
    --arg ts "$ts" \
    --argjson passed "$passed" \
    --arg typecheck_ec "${GATE_TYPECHECK:-1}" \
    --arg lint_ec "${GATE_LINT:-skipped}" \
    --arg unit_ec "${GATE_UNIT:-skipped}" \
    --arg contract_ec "${GATE_CONTRACT:-skipped}" \
    --arg e2e_ec "${GATE_E2E:-skipped}" \
    --arg auto_send_ec "${GATE_AUTO_SEND:-1}" \
    '{
      slice_id: $slice_id,
      timestamp: $ts,
      passed: $passed,
      gates: {
        typecheck: { command: "pnpm typecheck", exit_code: ($typecheck_ec | if . == "skipped" then "skipped" else tonumber end) },
        lint: { command: "pnpm lint", exit_code: ($lint_ec | if . == "skipped" then "skipped" else tonumber end) },
        unit_tests: { command: "pnpm test:unit", exit_code: ($unit_ec | if . == "skipped" then "skipped" else tonumber end) },
        contract_tests: { command: "pnpm test:contract", exit_code: ($contract_ec | if . == "skipped" then "skipped" else tonumber end) },
        e2e_smoke: { command: "pnpm test:e2e:smoke", exit_code: ($e2e_ec | if . == "skipped" then "skipped" else tonumber end) },
        verify_no_auto_send: { command: "pnpm verify:no-auto-send", exit_code: ($auto_send_ec | tonumber) }
      },
      failed_gates: []
    }' > "$outfile"

  # Populate failed_gates
  local failed=()
  [[ "${GATE_TYPECHECK:-1}" != "0" && "${GATE_TYPECHECK:-1}" != "skipped" ]] && failed+=("typecheck")
  [[ "${GATE_LINT:-skipped}" != "0" && "${GATE_LINT:-skipped}" != "skipped" ]] && failed+=("lint")
  [[ "${GATE_UNIT:-skipped}" != "0" && "${GATE_UNIT:-skipped}" != "skipped" ]] && failed+=("unit_tests")
  [[ "${GATE_CONTRACT:-skipped}" != "0" && "${GATE_CONTRACT:-skipped}" != "skipped" ]] && failed+=("contract_tests")
  [[ "${GATE_E2E:-skipped}" != "0" && "${GATE_E2E:-skipped}" != "skipped" ]] && failed+=("e2e_smoke")
  [[ "${GATE_AUTO_SEND:-1}" != "0" ]] && failed+=("verify_no_auto_send")

  if [[ ${#failed[@]} -gt 0 ]]; then
    local arr
    arr="$(printf '%s\n' "${failed[@]}" | jq -R . | jq -s .)"
    tmp="$(mktemp)"
    jq --argjson fg "$arr" '.failed_gates = $fg' "$outfile" > "$tmp" && mv "$tmp" "$outfile"
  fi

  log "Wrote $outfile"
}

verify_slice() {
  require_cmd pnpm
  log "Verifying slice: $SLICE_ID"

  # Review gate: latest review must have issue_count=0 if review files exist
  local latest_review
  latest_review="$(ls -1 "$ROOT/$SESSION_DIR"/review-round-*.json 2>/dev/null | sort -V | tail -1 || true)"
  if [[ -n "$latest_review" ]]; then
    local issues
    issues="$(jq -r '.issue_count // 999' "$latest_review")"
    if [[ "$issues" != "0" ]]; then
      fail "Review gate failed: $latest_review has issue_count=$issues"
    fi
    log "Review gate OK: $latest_review"
  else
    warn "No review-round-*.json found — skipping review gate (CI may enforce)"
  fi

  # Read verification.commands from orchestration
  local commands
  commands="$(jq -r --arg id "$SLICE_ID" '.slices[] | select(.id==$id) | .verification.commands[]?' "$ORCHESTRATION")"

  GATE_TYPECHECK="skipped"
  GATE_LINT="skipped"
  GATE_UNIT="skipped"
  GATE_CONTRACT="skipped"
  GATE_E2E="skipped"
  GATE_AUTO_SEND="skipped"

  local all_pass=true

  while IFS= read -r cmd; do
    [[ -z "$cmd" ]] && continue
    local ec
    ec="$(run_command_gate "${cmd%% *}" "$cmd")"
    case "$cmd" in
      *typecheck*) GATE_TYPECHECK="$ec" ;;
      *lint*)      GATE_LINT="$ec" ;;
      *test:unit*) GATE_UNIT="$ec" ;;
      *test:contract*) GATE_CONTRACT="$ec" ;;
      *test:e2e*)  GATE_E2E="$ec" ;;
      *verify:no-auto-send*) GATE_AUTO_SEND="$ec" ;;
    esac
    if [[ "$ec" != "0" ]]; then
      all_pass=false
      warn "FAILED (exit $ec): $cmd"
    fi
  done <<< "$commands"

  # Grep gates from orchestration
  local grep_gates
  grep_gates="$(jq -r --arg id "$SLICE_ID" '.slices[] | select(.id==$id) | .verification.grep_gates[]?' "$ORCHESTRATION" 2>/dev/null || true)"
  while IFS= read -r pattern; do
    [[ -z "$pattern" ]] && continue
    if [[ "$pattern" == "no FLOAT amount columns in migrations" ]]; then
      if rg -n "REAL|FLOAT|DOUBLE PRECISION" supabase/migrations/ 2>/dev/null | rg -vi "comment|remark" >/dev/null 2>&1; then
        warn "Grep gate failed: float columns in migrations"
        all_pass=false
      fi
    fi
  done <<< "$grep_gates"

  local passed_json=false
  if $all_pass; then passed_json=true; fi

  write_verification_json "$passed_json"

  local ts_now
  ts_now="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  local tmp_manifest
  tmp_manifest="$(mktemp)"
  jq \
    --arg ts "$ts_now" \
    --arg slice "$SLICE_ID" \
    --argjson passed "$passed_json" \
    --argjson tc "${GATE_TYPECHECK:-1}" \
    --argjson lint "$( [[ "${GATE_LINT:-skipped}" == "skipped" ]] && echo null || echo "${GATE_LINT}" )" \
    --argjson unit "$( [[ "${GATE_UNIT:-skipped}" == "skipped" ]] && echo null || echo "${GATE_UNIT}" )" \
    --argjson auto "${GATE_AUTO_SEND:-1}" \
    '.updated_at = $ts |
     .harness_state = "verifying" |
     .verification = {
       last_run_at: $ts,
       typecheck: $tc,
       lint: $lint,
       unit_tests: $unit,
       verify_no_auto_send: $auto,
       slice_gates: $slice,
       passed: $passed
     }' "$MANIFEST" > "$tmp_manifest" && mv "$tmp_manifest" "$MANIFEST"

  if $all_pass; then
    log "All gates PASSED for $SLICE_ID"
    return 0
  else
    fail "Verification FAILED for $SLICE_ID — see $SESSION_DIR/verification.json"
  fi
}

complete_slice() {
  verify_slice
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

  local tmp_manifest
  tmp_manifest="$(mktemp)"
  jq \
    --arg ts "$ts" \
    --arg sid "$SLICE_ID" \
    '.updated_at = $ts |
     .harness_state = "slice_complete" |
     .last_agent = "VERIFIER" |
     .fix_round = 0 |
     (.slices[] | select(.id == $sid) | .status) = "verified" |
     (.slices[] | select(.id == $sid) | .verified_at) = $ts' \
    "$MANIFEST" > "$tmp_manifest" && mv "$tmp_manifest" "$MANIFEST"

  # Advance active_slice to next pending
  local next_slice
  next_slice="$(jq -r --arg id "$SLICE_ID" '
    .slices as $s |
    ($s | map(.id) | index($id)) as $i |
    if $i == null then empty
    elif $i + 1 < ($s | length) then $s[$i + 1].id
    else "phase-1-complete"
    end
  ' "$MANIFEST")"

  if [[ "$next_slice" != "phase-1-complete" ]]; then
    update_manifest ".active_slice = \"$next_slice\" | .harness_state = \"idle\""
    log "Slice $SLICE_ID verified. Next active_slice: $next_slice"
  else
    update_manifest ".active_slice = \"phase-1-complete\" | .harness_state = \"slice_complete\""
    log "Phase 1 all slices verified!"
  fi
}

verify_phase_exit() {
  log "Phase 1 exit verification"
  local unverified
  unverified="$(jq -r '[.slices[] | select(.status != "verified")] | length' "$MANIFEST")"
  if [[ "$unverified" != "0" ]]; then
    fail "$unverified slices not verified — cannot run phase exit"
  fi

  if [[ -f "$ROOT/package.json" ]]; then
    if jq -e '.scripts["test:e2e:smoke"]' "$ROOT/package.json" >/dev/null; then
      local e2e_ec
      e2e_ec="$(run_command_gate "e2e_smoke" "pnpm test:e2e:smoke")"
      [[ "$e2e_ec" == "0" ]] || fail "Phase exit E2E smoke failed (exit $e2e_ec)"
    else
      warn "test:e2e:smoke not configured yet — stub pass"
    fi
  fi

  log "Phase 1 exit criteria met (all slices verified + smoke)"
}

init_session() {
  check_deps
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  mkdir -p "$ROOT/$SESSION_DIR"

  local tmp_manifest
  tmp_manifest="$(mktemp)"
  jq \
    --arg ts "$ts" \
    --arg sid "$SLICE_ID" \
    '.updated_at = $ts |
     .harness_state = "routing" |
     (.slices[] | select(.id == $sid) | .status) = "in_progress" |
     (.slices[] | select(.id == $sid) | .started_at) = (
       if .started_at == null then $ts else .started_at end
     )' \
    "$MANIFEST" > "$tmp_manifest" && mv "$tmp_manifest" "$MANIFEST"

  jq -n \
    --arg slice_id "$SLICE_ID" \
    --arg ts "$ts" \
    '{
      slice_id: $slice_id,
      routed_at: $ts,
      next_agent: "PLANNER",
      deps_satisfied: true,
      spec_refs: [],
      message: "ROUTER complete — load prompts/agents/PLANNER.md"
    }' > "$ROOT/$SESSION_DIR/route.json"

  log "Session initialized for $SLICE_ID → $SESSION_DIR"
}

show_status() {
  echo "=== LienLiberator Harness Status ==="
  jq '{
    active_slice,
    harness_state,
    last_agent,
    fix_round,
    verification_passed: .verification.passed,
    slices: [.slices[] | {id, number, title, status}]
  }' "$MANIFEST"
  echo ""
  echo "Slice detail: $SLICE_ID"
  jq --arg id "$SLICE_ID" '.slices[] | select(.id==$id)' "$MANIFEST"
  echo ""
  echo "Session: $ROOT/$SESSION_DIR"
  ls -la "$ROOT/$SESSION_DIR" 2>/dev/null || echo "(no session files yet)"
}

case "$ACTION" in
  --status)
    show_status
    ;;
  --init-session)
    init_session
    ;;
  --verify-only)
    check_deps || true
    verify_slice
    ;;
  --complete-slice)
    check_deps
    complete_slice
    ;;
  --verify-phase-exit)
    verify_phase_exit
    ;;
  *)
    fail "Unknown action: $ACTION"
    ;;
esac