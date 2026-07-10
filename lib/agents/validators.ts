/**
 * Post-parse validation for agent outputs — citation grounding, thresholds.
 * @see docs/BUILD_SPEC_AGENTS.md §3–§5
 */

import type {
  IntakeClassificationOutput,
  VerifierResultOutput,
  LetterDraftOutput,
} from '@/lib/agents/schemas';
import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

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
    output.forgery_risk ||
    output.relevant === false;

  return { valid: errors.length === 0, human_gate_required, errors };
}

// Statute sections the curated corpus actually supports (BNSS 106 seizure,
// BNSS 107 Magistrate attachment). Any other BNSS/BNS/IPC/CrPC/Section number
// in a draft is treated as an invented citation and the draft falls back to
// the verified template (runDrafter checks `valid`).
const ALLOWED_STATUTE_SECTIONS = new Set(['106', '107']);
// "Section 1"–"Section 6" are the letter's own structural headings (see
// prompts/drafter.ts), not statute citations.
const LETTER_HEADING_SECTIONS = new Set(['1', '2', '3', '4', '5', '6']);

function findUnsupportedLegalCitations(text: string): string[] {
  const bad: string[] = [];

  // Repealed codes must never appear (BNSS/BNS replaced CrPC/IPC in 2024),
  // and BNSS/BNS may only cite the sections our corpus grounds.
  for (const m of text.matchAll(/\b(BNSS|BNS|IPC|CrPC)\s*(?:Section\s*)?(\d+[A-Za-z]?)\b/gi)) {
    const code = m[1].toUpperCase();
    const section = m[2].toUpperCase();
    if (code === 'IPC' || code === 'CRPC') bad.push(m[0]);
    else if (!ALLOWED_STATUTE_SECTIONS.has(section)) bad.push(m[0]);
  }

  for (const m of text.matchAll(/\bSection\s+(\d+[A-Za-z]?)\b/gi)) {
    const section = m[1].toUpperCase();
    if (!ALLOWED_STATUTE_SECTIONS.has(section) && !LETTER_HEADING_SECTIONS.has(section)) {
      bad.push(m[0]);
    }
  }

  return bad;
}

export function validateDrafterOutput(
  output: LetterDraftOutput,
  track?: UnfreezeTrack,
): ValidationResult {
  const errors: string[] = [];

  if (output.disclaimer_block !== 'DRAFT ONLY — REVIEW BEFORE USE') {
    errors.push('disclaimer_block must be exact literal');
  }

  for (const citation of findUnsupportedLegalCitations(`${output.subject}\n${output.body}`)) {
    errors.push(`unsupported legal citation: ${citation}`);
  }

  // A KYC/court/tax freeze is not a police freeze: BNSS 106/107 and the GRM
  // path must not appear in those letters even though 106/107 are on the
  // general allowlist above (they're valid only on the cyber track).
  if (track && track !== 'cyber') {
    const text = `${output.subject}\n${output.body}`;
    if (/\bBNSS\b/i.test(text) || /\bSection\s*10[67]\b/i.test(text)) {
      errors.push(`BNSS/police-freeze citation is not valid for a ${track}-track freeze`);
    }
  }

  const human_gate_required =
    output.confidence < DRAFTER_AUTO_THRESHOLD || output.placeholders_missing.length > 0;

  return { valid: errors.length === 0, human_gate_required, errors };
}