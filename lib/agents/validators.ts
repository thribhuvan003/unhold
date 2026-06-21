/**
 * Post-parse validation for agent outputs — citation grounding, thresholds.
 * @see docs/BUILD_SPEC_AGENTS.md §3–§5
 */

import type {
  IntakeClassificationOutput,
  VerifierResultOutput,
  LetterDraftOutput,
} from '@/lib/agents/schemas';

const INTAKE_AUTO_THRESHOLD = 0.75;
const VERIFIER_AUTO_THRESHOLD = 0.85;
const DRAFTER_AUTO_THRESHOLD = 0.7;

export type ValidationResult = {
  valid: boolean;
  human_gate_required: boolean;
  errors: string[];
};

export function validateIntakeOutput(
  output: IntakeClassificationOutput,
  sourceIds: Set<string>,
): ValidationResult {
  const errors: string[] = [];

  for (const citation of output.citations) {
    if (!sourceIds.has(citation.source_id)) {
      errors.push(`citation source_id not in manifest: ${citation.source_id}`);
    }
  }

  if (output.refuse_to_classify && !output.refuse_reason) {
    errors.push('refuse_to_classify requires refuse_reason');
  }

  const human_gate_required =
    output.human_review_required ||
    output.confidence < INTAKE_AUTO_THRESHOLD ||
    output.refuse_to_classify;

  return { valid: errors.length === 0, human_gate_required, errors };
}

export function validateVerifierOutput(output: VerifierResultOutput): ValidationResult {
  const errors: string[] = [];

  if (output.forgery_risk && output.confidence >= VERIFIER_AUTO_THRESHOLD) {
    errors.push('forgery_risk cannot coexist with high confidence auto-accept');
  }

  const human_gate_required =
    output.human_review_required ||
    output.confidence < VERIFIER_AUTO_THRESHOLD ||
    output.forgery_risk;

  return { valid: errors.length === 0, human_gate_required, errors };
}

export function validateDrafterOutput(output: LetterDraftOutput): ValidationResult {
  const errors: string[] = [];

  if (output.disclaimer_block !== 'DRAFT ONLY — REVIEW BEFORE USE') {
    errors.push('disclaimer_block must be exact literal');
  }

  const human_gate_required =
    output.confidence < DRAFTER_AUTO_THRESHOLD || output.placeholders_missing.length > 0;

  return { valid: errors.length === 0, human_gate_required, errors };
}