import type {
  CaseContext,
  CaseStatus,
  GuardName,
  GuardResult,
  TransitionEvent,
  TransitionRule,
} from '@/lib/state-machine/types';

export const TRANSITION_RULES: TransitionRule[] = [
  { from: 'new', event: 'evidence.submitted', to: 'intake_scoping', guard: 'has_min_evidence' },
  { from: 'intake_scoping', event: 'intake.classified', to: 'monitoring', guard: 'playbook_assigned' },
  { from: 'monitoring', event: 'checklist.complete', to: 'evidence_building', guard: 'checklist_complete' },
  { from: 'monitoring', event: 'user.abandon', to: 'closed', guard: 'valid_transition' },
  { from: 'monitoring', event: 'inactive_30d', to: 'closed', guard: 'valid_transition' },
  { from: 'evidence_building', event: 'bundle.ready', to: 'escalation', guard: 'bundle_sha256' },
  { from: 'escalation', event: 'user.mark_sent', to: 'awaiting_response', guard: 'proof_and_user_approved' },
  { from: 'awaiting_response', event: 'response.received', to: 'verified', guard: 'unfreeze_confirmed' },
  { from: 'awaiting_response', event: 'user.confirm_unfreeze', to: 'verified', guard: 'unfreeze_confirmed' },
  { from: 'awaiting_response', event: 'response.timeout', to: 'escalation', guard: 'has_prior_level_proof' },
  { from: 'awaiting_response', event: 'response.timeout', to: 'escalation', guard: 'level_below_l4' },
  { from: 'awaiting_response', event: 'inactive_45d', to: 'stalled', guard: 'valid_transition' },
  { from: 'verified', event: 'resolution.confirmed', to: 'resolved', guard: 'resolution_type_set' },
  { from: 'resolved', event: 'user.opt_in_stats', to: 'public_pressure', guard: 'public_stats_consent' },
  { from: 'resolved', event: 'bundle.delivered', to: 'closed', guard: 'valid_transition' },
  { from: 'stalled', event: 'user.reopen', to: 'retried', guard: 'valid_transition' },
  { from: 'retried', event: 'new.strategy', to: 'escalation', guard: 'valid_transition' },
  { from: 'escalation', event: 'low_confidence', to: 'human_escalation', guard: 'valid_transition' },
  { from: 'escalation', event: 'cost_cap', to: 'human_escalation', guard: 'valid_transition' },
  { from: 'escalation', event: 'user.request', to: 'human_escalation', guard: 'valid_transition' },
  { from: 'human_escalation', event: 'ops.handoff', to: 'closed', guard: 'valid_transition' },
];

export function findTransitionRule(
  from: CaseStatus,
  event: TransitionEvent,
): TransitionRule | null {
  return TRANSITION_RULES.find((rule) => rule.from === from && rule.event === event) ?? null;
}

export function activeEvidence(ctx: CaseContext) {
  return ctx.evidence.filter((item) => item.deleted_at === null && item.sha256_verified_at);
}

export function guardHasMinEvidence(ctx: CaseContext): GuardResult {
  const count = activeEvidence(ctx).length;
  return count >= 1
    ? { ok: true }
    : { ok: false, guard: 'has_min_evidence', message: 'At least one verified evidence required' };
}

export function guardPlaybookAssigned(ctx: CaseContext): GuardResult {
  return ctx.case.playbook_id
    ? { ok: true }
    : { ok: false, guard: 'playbook_assigned', message: 'Playbook must be assigned' };
}

export function guardChecklistComplete(ctx: CaseContext): GuardResult {
  const verifiedTypes = new Set(activeEvidence(ctx).map((e) => e.evidence_type));
  const required = ctx.checklist.filter((item) => !item.optional);
  if (required.length === 0) return { ok: true };

  const missing = required.filter((item) => !verifiedTypes.has(item.evidence_type));
  return missing.length === 0
    ? { ok: true }
    : {
        ok: false,
        guard: 'checklist_complete',
        message: `Missing evidence: ${missing.map((m) => m.evidence_type).join(', ')}`,
      };
}

export function guardBundleSha256(ctx: CaseContext): GuardResult {
  const bundleSha = ctx.payload.bundle_sha256 ?? ctx.case.metadata_json.bundle_sha256;
  if (typeof bundleSha === 'string' && /^[a-f0-9]{64}$/.test(bundleSha)) {
    return { ok: true };
  }
  return {
    ok: false,
    guard: 'bundle_sha256',
    message: 'Evidence bundle SHA-256 required',
  };
}

export function guardProofAndUserApproved(ctx: CaseContext): GuardResult {
  const level = (ctx.payload.escalation_level as string | undefined) ?? ctx.case.escalation_level;
  const escalation = ctx.escalations.find((e) => e.level === level);
  if (!escalation || escalation.status !== 'approved' && escalation.status !== 'sent') {
    return {
      ok: false,
      guard: 'proof_and_user_approved',
      message: 'Escalation must be approved before mark-sent',
    };
  }

  if (['L2', 'L3', 'L4'].includes(level)) {
    const prior = guardHasPriorLevelProof(ctx);
    if (!prior.ok) return prior;
  }

  return { ok: true };
}

export function guardHasPriorLevelProof(ctx: CaseContext): GuardResult {
  const requiredProof =
    (ctx.payload.required_proof as string | undefined) ??
    priorLevelFor(ctx.case.escalation_level);

  const priorLevel = requiredProof as 'L1' | 'L2' | 'L3';
  const prior = ctx.escalations.find((e) => e.level === priorLevel);
  const validStatuses = new Set(['sent', 'response_received', 'timeout']);

  if (prior && validStatuses.has(prior.status)) {
    return { ok: true };
  }

  return {
    ok: false,
    guard: 'has_prior_level_proof',
    message: `Prior level ${priorLevel} send proof required`,
  };
}

export function guardLevelBelowL4(ctx: CaseContext): GuardResult {
  const level = (ctx.payload.escalation_level as string | undefined) ?? ctx.case.escalation_level;
  return level !== 'L4'
    ? { ok: true }
    : { ok: false, guard: 'level_below_l4', message: 'Cannot timeout-retry at L4' };
}

export function guardUnfreezeConfirmed(ctx: CaseContext): GuardResult {
  const hasReleaseLetter = activeEvidence(ctx).some((e) => e.evidence_type === 'bank_release_letter');
  const userConfirmed = ctx.payload.confirmed === true || ctx.payload.resolution_confirmed_by === 'user';
  if (hasReleaseLetter || userConfirmed) return { ok: true };
  return {
    ok: false,
    guard: 'unfreeze_confirmed',
    message: 'Release evidence or user confirmation required',
  };
}

export function guardResolutionTypeSet(ctx: CaseContext): GuardResult {
  const resolutionType =
    (ctx.payload.resolution_type as string | undefined) ?? ctx.case.resolution_type;
  if (resolutionType) return { ok: true };
  return {
    ok: false,
    guard: 'resolution_type_set',
    message: 'resolution_type must be set',
  };
}

export function guardPublicStatsConsent(ctx: CaseContext): GuardResult {
  const optedIn = ctx.payload.public_stats_opt_in === true || ctx.case.public_stats_opt_in;
  return optedIn
    ? { ok: true }
    : {
        ok: false,
        guard: 'public_stats_consent',
        message: 'public_stats consent required',
      };
}

export function guardValidTransition(): GuardResult {
  return { ok: true };
}

const GUARD_RUNNERS: Record<GuardName, (ctx: CaseContext) => GuardResult> = {
  has_min_evidence: guardHasMinEvidence,
  playbook_assigned: guardPlaybookAssigned,
  checklist_complete: guardChecklistComplete,
  bundle_sha256: guardBundleSha256,
  proof_and_user_approved: guardProofAndUserApproved,
  has_prior_level_proof: guardHasPriorLevelProof,
  level_below_l4: guardLevelBelowL4,
  unfreeze_confirmed: guardUnfreezeConfirmed,
  resolution_type_set: guardResolutionTypeSet,
  public_stats_consent: guardPublicStatsConsent,
  valid_transition: guardValidTransition,
};

export function runGuard(guard: GuardName, ctx: CaseContext): GuardResult {
  return GUARD_RUNNERS[guard](ctx);
}

export function evaluateTransition(
  ctx: CaseContext,
  event: TransitionEvent,
): { ok: true; to: CaseStatus } | { ok: false; guard: GuardName; message: string } {
  const rule = findTransitionRule(ctx.case.status, event);
  if (!rule) {
    return {
      ok: false,
      guard: 'valid_transition',
      message: `Invalid transition from ${ctx.case.status} via ${event}`,
    };
  }

  const guardsToRun: GuardName[] = [rule.guard];
  if (rule.event === 'response.timeout') {
    guardsToRun.push('level_below_l4');
  }

  for (const guardName of guardsToRun) {
    const result = runGuard(guardName, ctx);
    if (!result.ok) {
      return {
        ok: false,
        guard: result.guard ?? guardName,
        message: result.message ?? 'Guard failed',
      };
    }
  }

  return { ok: true, to: rule.to };
}

function priorLevelFor(level: string): 'L1' | 'L2' | 'L3' {
  switch (level) {
    case 'L2':
      return 'L1';
    case 'L3':
      return 'L2';
    case 'L4':
      return 'L3';
    default:
      return 'L1';
  }
}