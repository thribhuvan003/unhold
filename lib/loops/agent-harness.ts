/**
 * Unhold — Build harness state machine types
 *
 * Product runtime agents (INTAKE, DRAFTER, …) live in lib/agents/.
 * This module types the **development harness** loop only.
 *
 * @see docs/HARNESS.md
 * @see config/harness/slice-orchestration.json
 */

// ─── Harness agent roles (build-time) ───────────────────────────────────────

export const HARNESS_AGENT_ROLES = [
  'ROUTER',
  'PLANNER',
  'IMPLEMENTER',
  'REVIEWER',
  'VERIFIER',
] as const;

export type HarnessAgentRole = (typeof HARNESS_AGENT_ROLES)[number];

// ─── Harness state machine ──────────────────────────────────────────────────

export const HARNESS_STATES = [
  'idle',
  'routing',
  'planning',
  'implementing',
  'reviewing',
  'fixing',
  'verifying',
  'blocked',
  'slice_complete',
] as const;

export type HarnessState = (typeof HARNESS_STATES)[number];

/** Maps harness_state → next agent per slice-orchestration.json resume_rules */
export const HARNESS_STATE_TO_AGENT: Record<HarnessState, HarnessAgentRole | 'Human'> = {
  idle: 'ROUTER',
  routing: 'PLANNER',
  planning: 'IMPLEMENTER',
  implementing: 'REVIEWER',
  reviewing: 'IMPLEMENTER', // default; REVIEWER sets VERIFIER when issue_count=0
  fixing: 'REVIEWER',
  verifying: 'IMPLEMENTER', // default; VERIFIER sets ROUTER/complete when pass
  blocked: 'Human',
  slice_complete: 'ROUTER',
};

// ─── Slice lifecycle ────────────────────────────────────────────────────────

export const SLICE_STATUSES = [
  'pending',
  'in_progress',
  'verified',
  'blocked',
] as const;

export type SliceStatus = (typeof SLICE_STATUSES)[number];

export const PHASE_1_SLICE_IDS = [
  'slice-01',
  'slice-02',
  'slice-03',
  'slice-04',
  'slice-05',
  'slice-06',
  'slice-07',
  'slice-08',
  'slice-09',
  'slice-10',
  'slice-11',
] as const;

export type Phase1SliceId = (typeof PHASE_1_SLICE_IDS)[number];

// ─── Review ─────────────────────────────────────────────────────────────────

export type ReviewIssueSeverity = 'blocker' | 'major' | 'minor' | 'nit';

export type ReviewIssueCategory =
  | 'spec'
  | 'security'
  | 'test'
  | 'style'
  | 'hallucination'
  | 'scope';

export interface ReviewIssue {
  id: string;
  severity: ReviewIssueSeverity;
  category: ReviewIssueCategory;
  file: string;
  line?: number;
  finding: string;
  spec_ref: string;
  fix_hint: string;
}

export interface ReviewRound {
  slice_id: Phase1SliceId | string;
  round: number;
  reviewer: 'REVIEWER';
  reviewed_at: string;
  diff_files: string[];
  issue_count: number;
  issues: ReviewIssue[];
  passed_checklist_sections: string[];
  approved: boolean;
  notes?: string;
}

/** Only blocker + major count toward issue_count */
export function countReviewIssues(issues: ReviewIssue[]): number {
  return issues.filter((i) => i.severity === 'blocker' || i.severity === 'major').length;
}

// ─── Verification ───────────────────────────────────────────────────────────

export interface GateResult {
  command: string;
  exit_code: number | 'skipped';
  stderr_tail?: string;
}

export interface VerificationResult {
  slice_id: Phase1SliceId | string;
  timestamp: string;
  passed: boolean;
  gates: Record<string, GateResult>;
  failed_gates: string[];
  slice_specific?: Array<{
    check: string;
    expected: unknown;
    actual: unknown;
    passed: boolean;
  }>;
  verifier_notes?: string;
}

// ─── Routing ────────────────────────────────────────────────────────────────

export interface RouteDecision {
  slice_id: Phase1SliceId | string;
  routed_at: string;
  active_slice: string;
  harness_state_before: HarnessState;
  harness_state_after: HarnessState;
  deps_satisfied: boolean;
  missing_deps: string[];
  next_agent: HarnessAgentRole | 'Human';
  next_prompt: string;
  spec_refs: string[];
  scope_file_count: number;
  forbidden_patterns_reminder: string[];
  commands_suggested: string[];
  message: string;
}

// ─── MANIFEST ───────────────────────────────────────────────────────────────

export interface SliceManifestEntry {
  id: Phase1SliceId | string;
  number: number;
  title: string;
  status: SliceStatus;
  depends_on: string[];
  started_at: string | null;
  verified_at: string | null;
  pr_branch: string | null;
  session_dir: string;
}

export interface ManifestVerification {
  last_run_at: string | null;
  typecheck: number | null;
  lint: number | null;
  unit_tests: number | null;
  verify_no_auto_send: number | null;
  slice_gates: string | null;
  passed: boolean | null;
}

export interface ManifestReview {
  last_round: number;
  open_issues: number;
  last_review_at: string | null;
  review_file: string | null;
}

export interface ManifestMemory {
  decisions: Array<{
    id: string;
    date: string;
    decision: string;
    spec_ref: string;
  }>;
  blockers: string[];
  spec_gaps: string[];
}

export interface HarnessManifest {
  version: string;
  project: 'lienliberator';
  phase: 1;
  phase_exit_criteria: string;
  active_slice: Phase1SliceId | 'phase-1-complete' | string;
  harness_state: HarnessState;
  last_agent: HarnessAgentRole | null;
  fix_round: number;
  max_fix_rounds: number;
  orchestration_config: string;
  started_at: string;
  updated_at: string;
  slices: SliceManifestEntry[];
  verification: ManifestVerification;
  review: ManifestReview;
  memory: ManifestMemory;
}

// ─── Orchestration config types ─────────────────────────────────────────────

export interface AgentPipelineStep {
  order: number;
  role: HarnessAgentRole;
  prompt: string;
  may_edit_code: boolean;
  outputs: string[];
  exit_when: string;
  loop?: {
    condition: string;
    next_agent: HarnessAgentRole;
    max_rounds: number;
    then?: string;
    abbreviated_reviewer?: boolean;
  };
}

export interface SliceVerificationConfig {
  commands: string[];
  optional?: string[];
  grep_gates?: string[];
  min_guard_tests?: number;
}

export interface SliceOrchestrationEntry {
  id: Phase1SliceId | string;
  number: number;
  title: string;
  week?: number;
  depends_on: string[];
  spec_refs: string[];
  scope_files: string[];
  forbidden_in_slice: string[];
  acceptance_criteria: string[];
  verification: SliceVerificationConfig;
  agent_notes?: Partial<Record<HarnessAgentRole, string>>;
}

export interface SliceOrchestrationConfig {
  version: string;
  project: string;
  phase: number;
  description: string;
  global_agent_pipeline: AgentPipelineStep[];
  slices: SliceOrchestrationEntry[];
  resume_rules: {
    on_session_start: string;
    harness_state_to_agent: Record<HarnessState, HarnessAgentRole | 'Human'>;
  };
}

// ─── State machine transitions (harness) ────────────────────────────────────

export type HarnessEvent =
  | 'session.start'
  | 'router.complete'
  | 'plan.complete'
  | 'implement.complete'
  | 'review.issues_found'
  | 'review.approved'
  | 'verify.failed'
  | 'verify.passed'
  | 'slice.complete'
  | 'max_rounds.exceeded'
  | 'deps.failed';

export interface HarnessTransition {
  from: HarnessState;
  event: HarnessEvent;
  to: HarnessState;
  guard?: string;
  next_agent?: HarnessAgentRole | 'Human';
}

export const HARNESS_TRANSITIONS: HarnessTransition[] = [
  { from: 'idle', event: 'session.start', to: 'routing', next_agent: 'ROUTER' },
  { from: 'routing', event: 'router.complete', to: 'planning', next_agent: 'PLANNER' },
  { from: 'planning', event: 'plan.complete', to: 'implementing', next_agent: 'IMPLEMENTER' },
  { from: 'implementing', event: 'implement.complete', to: 'reviewing', next_agent: 'REVIEWER' },
  {
    from: 'reviewing',
    event: 'review.issues_found',
    to: 'fixing',
    guard: 'issue_count > 0',
    next_agent: 'IMPLEMENTER',
  },
  {
    from: 'reviewing',
    event: 'review.approved',
    to: 'verifying',
    guard: 'issue_count === 0',
    next_agent: 'VERIFIER',
  },
  { from: 'fixing', event: 'implement.complete', to: 'reviewing', next_agent: 'REVIEWER' },
  {
    from: 'verifying',
    event: 'verify.failed',
    to: 'fixing',
    guard: 'fix_round < max_verify_rounds',
    next_agent: 'IMPLEMENTER',
  },
  {
    from: 'verifying',
    event: 'verify.passed',
    to: 'slice_complete',
    next_agent: 'ROUTER',
  },
  { from: 'slice_complete', event: 'slice.complete', to: 'idle', next_agent: 'ROUTER' },
  {
    from: 'reviewing',
    event: 'max_rounds.exceeded',
    to: 'blocked',
    guard: 'fix_round >= max_review_rounds',
    next_agent: 'Human',
  },
  {
    from: 'verifying',
    event: 'max_rounds.exceeded',
    to: 'blocked',
    next_agent: 'Human',
  },
  { from: 'idle', event: 'deps.failed', to: 'blocked', next_agent: 'Human' },
];

// ─── Pure helpers ───────────────────────────────────────────────────────────

export function getNextHarnessState(
  current: HarnessState,
  event: HarnessEvent,
  context?: { issue_count?: number; fix_round?: number; max_rounds?: number },
): HarnessState | null {
  const match = HARNESS_TRANSITIONS.find((t) => t.from === current && t.event === event);
  if (!match) return null;

  if (match.guard) {
    if (match.guard === 'issue_count > 0' && (context?.issue_count ?? 0) <= 0) return null;
    if (match.guard === 'issue_count === 0' && (context?.issue_count ?? 1) > 0) return null;
    if (
      match.guard === 'fix_round < max_verify_rounds' &&
      (context?.fix_round ?? 0) >= (context?.max_rounds ?? 3)
    )
      return null;
    if (
      match.guard === 'fix_round >= max_review_rounds' &&
      (context?.fix_round ?? 0) < (context?.max_rounds ?? 5)
    )
      return null;
  }

  return match.to;
}

export function canStartSlice(
  slice: SliceOrchestrationEntry,
  manifest: HarnessManifest,
): { ok: boolean; missing_deps: string[] } {
  const missing = slice.depends_on.filter((depId) => {
    const entry = manifest.slices.find((s) => s.id === depId);
    return !entry || entry.status !== 'verified';
  });
  return { ok: missing.length === 0, missing_deps: missing };
}

export function getSliceEntry(
  config: SliceOrchestrationConfig,
  sliceId: string,
): SliceOrchestrationEntry | undefined {
  return config.slices.find((s) => s.id === sliceId);
}

export function isPhase1Complete(manifest: HarnessManifest): boolean {
  return manifest.slices.every((s) => s.status === 'verified');
}

/** Default loop limits — mirror .claude/settings.json */
export const DEFAULT_MAX_REVIEW_ROUNDS = 5;
export const DEFAULT_MAX_VERIFY_ROUNDS = 3;