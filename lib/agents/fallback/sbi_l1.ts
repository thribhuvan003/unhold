/** Bank-agnostic branch grievance template (slug kept stable for drafts already stored). */
export const SBI_L1_TEMPLATE_SLUG = 'branch_lien_release';
/** @deprecated alias — same as SBI_L1_TEMPLATE_SLUG */
export const L1_TEMPLATE_SLUG = SBI_L1_TEMPLATE_SLUG;

export const SBI_L1_SUBJECT =
  'Request for review of lien / debit freeze and release of undisputed funds — A/c No. XXXXXX{{ACCOUNT_LAST4}}';

export const SBI_L1_BODY = `Date: {{TODAY_DATE}}

From:
{{USER_NAME}}
{{USER_ADDRESS}}
Phone: {{USER_PHONE}}

To,
The Branch Manager
{{BANK_NAME}}
{{BRANCH_CITY}} Branch

Subject: Request for review of lien / debit freeze and release of undisputed funds — A/c No. XXXXXX{{ACCOUNT_LAST4}} — NCRP Ref: {{NCRP_ID}}

Respected Sir / Madam,

I, {{USER_NAME}}, hold savings account XXXXXX{{ACCOUNT_LAST4}} at your branch. My account was placed under {{FREEZE_DESCRIPTION}} around {{FREEZE_DATE}} (NCRP ref {{NCRP_ID}}, disputed amount approx. Rs. {{AMOUNT_INR}}).

{{SITUATION_LINE}}

I request you to, within 7 days:
1. Confirm in writing which authority ordered the freeze, the FIR/NCRP reference (if any), the legal provision used, the Investigating Officer's name and contact, and the exact amount held (a lien on the disputed sum only, or a full freeze).
{{L1_KEY_REQUESTS}}

{{LEGAL_GROUNDING}}

Attached: {{ATTACHMENTS_LINE}}. {{DECLARATION_LINE}}

Please acknowledge this letter with a stamped copy or reference number.

Yours faithfully,

{{USER_NAME}}
Phone: {{USER_PHONE}}
Date: {{TODAY_DATE}}`;

export const SBI_L1_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'USER_ADDRESS',
  'BANK_NAME',
  'BRANCH_CITY',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'FREEZE_DATE',
  // NCRP_ID is intentionally NOT required: a freeze often precedes filing on
  // NCRP, and the intake calls it optional ("if you have one"). Requiring it
  // wrongly locked sending for users without a complaint number.
  'USER_PHONE',
] as const;
