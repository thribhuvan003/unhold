import 'server-only';

import { ApiError } from '@/lib/api/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import { getLadderStep, type EscalationLevel } from '@/lib/escalations/ladder';
import type { Database } from '@/supabase/database.types';

type EscalationRow = Database['public']['Tables']['escalations']['Row'];
type ConsentType = Database['public']['Enums']['consent_type'];

const SENT_STATUSES: EscalationRow['status'][] = ['sent', 'response_received', 'timeout'];

export type ProofGateResult = {
  passed: boolean;
  targetLevel: EscalationLevel;
  blockedReason?: string;
  guard?: string;
  missingProof?: string[];
};

export type ProofGateInput = {
  targetLevel: EscalationLevel;
  escalations: Pick<EscalationRow, 'level' | 'status' | 'sent_at' | 'sent_proof_evidence_id'>[];
  hasEscalationSendConsent: boolean;
  /**
   * Slice-14: bundle completeness + verifier confidence wired into the gates as
   * an ADDITIONAL requirement (the "complete verified package before you send"
   * pattern). These never substitute for the send-proof chain — they only add
   * to it. Omitted (undefined) = not evaluated (back-compatible with §4.3 tests).
   */
  hasSealedBundle?: boolean;
  verifierConfidence?: number;
};

/** A document must reach this vision confidence to count toward escalation readiness. */
const MIN_VERIFIER_CONFIDENCE = 0.5;

/**
 * Pure proof-gate evaluator — unit-testable without DB.
 * @see BUILD_SPEC §4.3, prompts/product/ESCALATOR.md
 */
export function evaluateProofGate(input: ProofGateInput): ProofGateResult {
  const { targetLevel } = input;
  const step = getLadderStep(targetLevel);
  const missingProof: string[] = [];

  // 1) Prior-level send-proof chain (BUILD_SPEC §4.3) — never bypassable.
  if (step.requiredProofLevel) {
    const prior = input.escalations.find((e) => e.level === step.requiredProofLevel);
    if (!prior || !SENT_STATUSES.includes(prior.status) || !prior.sent_at || !prior.sent_proof_evidence_id) {
      missingProof.push(`${step.requiredProofLevel}_send_proof`);
    }
  }

  // 2) Escalation-send consent (L3+).
  if (step.requiredConsent === 'escalation_send' && !input.hasEscalationSendConsent) {
    missingProof.push('escalation_send_consent');
  }

  // 3) Slice-14: evidence readiness — an ADDITIONAL requirement, evaluated only
  //    when the caller supplies the signals. A sealed bundle / verified document
  //    can never substitute for the send-proof chain above; it stacks on top.
  if (input.hasSealedBundle !== undefined && !input.hasSealedBundle) {
    missingProof.push('evidence_bundle');
  }
  if (input.verifierConfidence !== undefined && input.verifierConfidence < MIN_VERIFIER_CONFIDENCE) {
    missingProof.push('evidence_verification');
  }

  if (missingProof.length > 0) {
    const guard = missingProof.includes('escalation_send_consent')
      ? 'escalation_send_consent'
      : missingProof.some((m) => m.endsWith('_send_proof'))
        ? 'has_prior_level_proof'
        : 'evidence_not_ready';
    return {
      passed: false,
      targetLevel,
      blockedReason: `Proof gate failed for ${targetLevel}: ${missingProof.join(', ')}`,
      guard,
      missingProof,
    };
  }

  return { passed: true, targetLevel };
}

async function hasEscalationSendConsent(caseId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('consent_records')
    .select('id')
    .eq('case_id', caseId)
    .eq('consent_type', 'escalation_send' satisfies ConsentType)
    .eq('granted', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Server-side proof gate check for API routes and ESCALATOR.
 */
export async function checkProofGates(
  caseId: string,
  targetLevel: EscalationLevel,
): Promise<ProofGateResult> {
  const supabase = createAdminClient();

  const { data: escalations, error } = await supabase
    .from('escalations')
    .select('level, status, sent_at, sent_proof_evidence_id')
    .eq('case_id', caseId);

  if (error) {
    throw new Error(`proof_gate_load_failed: ${error.message}`);
  }

  const hasConsent =
    getLadderStep(targetLevel).requiredConsent === 'escalation_send'
      ? await hasEscalationSendConsent(caseId)
      : false;

  // slice-14: detect sealed bundle via append-only action log (written by /evidence/bundle route)
  const { data: bundleLog } = await supabase
    .from('action_logs')
    .select('id')
    .eq('case_id', caseId)
    .eq('action', 'evidence.bundle_generated')
    .limit(1)
    .maybeSingle();
  const hasSealedBundle = Boolean(bundleLog);

  // slice-14: best verified-document confidence (excluding forgery-flagged / deleted).
  const { data: evidenceRows } = await supabase
    .from('evidence')
    .select('vision_confidence, forgery_flag')
    .eq('case_id', caseId)
    .is('deleted_at', null);
  const verifierConfidence = (evidenceRows ?? []).reduce(
    (max, e) => (e.forgery_flag ? max : Math.max(max, e.vision_confidence ?? 0)),
    0,
  );

  return evaluateProofGate({
    targetLevel,
    escalations: escalations ?? [],
    hasEscalationSendConsent: hasConsent,
    hasSealedBundle,
    verifierConfidence,
  });
}

export function assertProofGate(result: ProofGateResult): void {
  if (!result.passed) {
    throw new ApiError(
      422,
      'guard_failed',
      result.blockedReason ?? 'Escalation proof gate not satisfied',
      { guard: result.guard ?? 'has_prior_level_proof' },
    );
  }
}