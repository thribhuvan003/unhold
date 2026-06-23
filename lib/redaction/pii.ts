import 'server-only';

import type { VerifierResultOutput } from '@/lib/agents/schemas';

// No \b anchors: OCR transcriptions routinely glue labels directly onto
// digits with no separator (e.g. "Acc123456789012"), and \b only fires at a
// word-character boundary — a letter immediately followed by a digit is not
// one, so anchored patterns would silently fail to match the exact PII this
// function exists to catch.
const PAN_PATTERN = /[A-Z]{5}\d{4}[A-Z]/g;
const LONG_DIGIT_PATTERN = /\d{9,18}/g;

function maskToLastFour(digits: string): string {
  return digits.length <= 4 ? digits : 'X'.repeat(digits.length - 4) + digits.slice(-4);
}

/**
 * Defense-in-depth against the model echoing full IDs/account numbers in
 * free-text fields — the system prompt also instructs it not to, but this
 * does not rely on that alone.
 */
export function redactPiiText(text: string): string {
  return text.replace(PAN_PATTERN, (m) => `XXXXX${m.slice(5)}`).replace(LONG_DIGIT_PATTERN, maskToLastFour);
}

/**
 * Redacts every free-text field in `extracted` (bank_name, freeze_type,
 * date_detected — all `z.string().optional()` with no format constraint, so
 * the model could put anything in them). `ncrp_id` is deliberately excluded:
 * it's the one field with a real format constraint (exactly 14 digits) and
 * blanket digit-masking would corrupt a legitimate value. `amount_paise` is
 * a number, not a string, so it's untouched either way.
 */
export function redactExtractedFields(
  extracted: VerifierResultOutput['extracted'],
): VerifierResultOutput['extracted'] {
  return {
    ...extracted,
    bank_name: extracted.bank_name ? redactPiiText(extracted.bank_name) : extracted.bank_name,
    freeze_type: extracted.freeze_type ? redactPiiText(extracted.freeze_type) : extracted.freeze_type,
    date_detected: extracted.date_detected ? redactPiiText(extracted.date_detected) : extracted.date_detected,
  };
}

/**
 * forgery_flags/mismatches are free-text the model writes about what it saw
 * on the document (e.g. "found account ending differs from on file") — same
 * echo risk as `extracted`, and this metadata is stored in swarm_events and
 * rendered straight to the case UI, so it needs the same defense-in-depth.
 */
export function redactForgeryFlags(flags: VerifierResultOutput['forgery_flags']): VerifierResultOutput['forgery_flags'] {
  return flags.map(redactPiiText);
}

export function redactMismatches(
  mismatches: VerifierResultOutput['mismatches'],
): VerifierResultOutput['mismatches'] {
  return mismatches.map((m) => ({
    field: m.field,
    expected: redactPiiText(m.expected),
    found: redactPiiText(m.found),
  }));
}
