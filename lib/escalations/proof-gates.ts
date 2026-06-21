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
};

/**
 * Pure proof-gate evaluator — unit-testable without DB.
 * @see BUILD_SPEC §4.3, prompts/product/ESCALATOR.md
 */
export function evaluateProofGate(input: ProofGateInput): ProofGateResult {
  const { targetLevel } = input;
  const step = getLadderStep(targetLevel);
  const missingProof: string[] = [];

  if (!step.requiredProofLevel) {
    return { passed: true, targetLevel };
  }

  const prior = input.escalations.find((e) => e.level === step.requiredProofLevel);
  if (!prior || !SENT_STATUSES.includes(prior.status)) {
    missingProof.push(`${step.requiredProofLevel}_send_proof`);
  } else if (!prior.sent_at || !prior.sent_proof_evidence_id) {
    missingProof.push(`${step.requiredProofLevel}_send_proof`);
  }

  if (step.requiredConsent === 'escalation_send' && !input.hasEscalationSendConsent) {
    missingProof.push('escalation_send_consent');
  }

  if (missingProof.length > 0) {
    return {
      passed: false,
      targetLevel,
      blockedReason: `Proof gate failed for ${targetLevel}: ${missingProof.join(', ')}`,
      guard: missingProof.includes('escalation_send_consent')
        ? 'escalation_send_consent'
        : 'has_prior_level_proof',
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

  return evaluateProofGate({
    targetLevel,
    escalations: escalations ?? [],
    hasEscalationSendConsent: hasConsent,
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