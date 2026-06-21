/**
 * Legal disclaimer blocks A–H — verbatim per BUILD_SPEC §10.1.
 * Do not paraphrase in UI; import these constants.
 */

export const DISCLAIMER_VERSION = 'disclaimer_v1.0_2026-06-20';

export const DISCLAIMER_BLOCKS = {
  /** A — Footer: not law firm / not RBI / helpline 1930 */
  A: `LienLiberator is not a law firm, not a bank, and not affiliated with the Reserve Bank of India (RBI). We provide document-preparation and case-tracking tools only. For cyber fraud, call the National Cyber Crime Helpline 1930.`,

  /** B — Intake modal: no guarantee; user responsible; required checkbox */
  B: `I understand LienLiberator does not guarantee unfreezing of my account or release of funds. I am solely responsible for reviewing all drafts before sending them. I will not upload banking passwords, UPI PINs, or full Aadhaar numbers.`,

  /** C — Letter: DRAFT ONLY (exact literal for agent outputs) */
  C: 'DRAFT ONLY — REVIEW BEFORE USE',

  /** D — Fee: success fee only after verified release; never unfreeze fees */
  D: `Success fees apply only after verified release of frozen funds, as confirmed by you with supporting evidence. LienLiberator never charges fees merely to attempt an unfreeze. Tier payments unlock features only — they do not bypass escalation proof requirements.`,

  /** E — Leaderboard: user-reported, not RBI data */
  E: `Bank rankings on LienLiberator are based on anonymized user-reported outcomes. They are not official RBI data, regulatory ratings, or bank endorsements. Sample sizes below five cases are not shown publicly.`,

  /** F — AI: may process outside India with consent */
  F: `LienLiberator uses AI to classify cases and draft letters. With your consent, case data may be processed by AI providers outside India. You may withdraw AI consent at any time; withdrawal does not delete prior audit logs.`,

  /** G — Evidence: don't upload passwords; own docs only */
  G: `Upload only documents you own or are authorized to share. Never upload net-banking passwords, UPI PINs, OTPs, or full Aadhaar. Mask government ID numbers to last four digits where possible.`,

  /** H — Human ops may review edge cases */
  H: `Trained human reviewers may access your case when automated confidence is low, panic keywords are detected, or you request assistance. Human review does not constitute legal advice.`,
} as const;

export type DisclaimerBlockId = keyof typeof DISCLAIMER_BLOCKS;

export const FOOTER_DISCLAIMER = DISCLAIMER_BLOCKS.A;
export const INTAKE_DISCLAIMER = DISCLAIMER_BLOCKS.B;
export const LETTER_DISCLAIMER = DISCLAIMER_BLOCKS.C;