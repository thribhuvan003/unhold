/**
 * Shared "is this document actually usable?" rule so the papers UI, the case
 * stage machine and the letter gate all agree.
 *
 * A blank or unreadable photo passes the tamper seal (it is a real file) but
 * the vision check gives it a low confidence — so a sealed file is NOT enough
 * to call a document "checked" or to unlock the letter. PDFs whose OCR is
 * skipped come back with null confidence; we give those the benefit of the
 * doubt (a human reviews them) rather than blocking legitimate PDF uploads.
 */

export const MIN_READABLE_CONFIDENCE = 0.5;

/**
 * True when a verified document is good enough to count toward progress and
 * unlock the next step. `confidence === null` means "not auto-read" (PDF or
 * still analysing) — trusted, pending human review; a known-low confidence
 * (e.g. a blank photo) is rejected.
 */
export function isReadable(confidence: number | null | undefined, forgery: boolean): boolean {
  if (forgery) return false;
  if (confidence === null || confidence === undefined) return true;
  return confidence >= MIN_READABLE_CONFIDENCE;
}

export type DocClass = 'clean' | 'saved' | 'unreadable' | 'flagged';

/** How to present a document's automated-check result to the user. */
export function classifyDoc(input: {
  confidence: number | null | undefined;
  forgery: boolean;
  hasMismatch: boolean;
}): DocClass {
  if (input.forgery) return 'unreadable';
  if (input.hasMismatch) return 'flagged';
  if (input.confidence === null || input.confidence === undefined) return 'saved';
  if (input.confidence >= MIN_READABLE_CONFIDENCE) return 'clean';
  return 'unreadable';
}
