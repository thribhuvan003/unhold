/** Bank-agnostic nodal / senior officer escalation. */
export const SBI_L2_TEMPLATE_SLUG = 'nodal_escalation';
/** @deprecated alias — same as SBI_L2_TEMPLATE_SLUG */
export const L2_TEMPLATE_SLUG = SBI_L2_TEMPLATE_SLUG;

export const SBI_L2_SUBJECT =
  'Formal escalation to Nodal Officer — Unresolved lien / debit freeze on A/c XXXXXX{{ACCOUNT_LAST4}} — L1 complaint dated {{L1_SENT_DATE}}';

export const SBI_L2_BODY = `Date: {{TODAY_DATE}}

To,
The Principal Nodal Officer (Customer Grievance Redressal)
{{BANK_NAME}}
Email: {{NODAL_EMAIL}}

Subject: Escalation — Unresolved freeze on A/c XXXXXX{{ACCOUNT_LAST4}} — L1 complaint dated {{L1_SENT_DATE}} — NCRP Ref: {{NCRP_ID}}

Respected Sir / Madam,

I, {{USER_NAME}} (A/c XXXXXX{{ACCOUNT_LAST4}}, {{BANK_NAME}}, {{BRANCH_CITY}}), am escalating a grievance that remains unresolved since my written complaint to the branch on {{L1_SENT_DATE}}. My account was frozen on {{FREEZE_DATE}} (NCRP ref {{NCRP_ID}}, disputed amount approx. Rs. {{AMOUNT_INR}}), and I have not received a satisfactory written response within a reasonable period, as required under the RBI grievance-redressal framework. This continues to cause me financial hardship.

I request you to:
1. Direct the {{BRANCH_CITY}} branch to provide the freeze details (authority, legal basis, IO contact) in writing within 5 working days.
2. Direct the branch to restrict any lien to the disputed amount and lift the hold on the balance above it. {{AMOUNT_RULE_LINE}}
3. Confirm my L1 representation has been forwarded to the CFCFRMS/GRM module, with the tracking reference.

{{LEGAL_GROUNDING}}

Attached: copy of my L1 letter dated {{L1_SENT_DATE}}, freeze SMS/notice, bank statement, NCRP acknowledgement (if available), and photo ID (masked). {{DECLARATION_LINE}}

Please acknowledge this escalation in writing with a grievance tracking number.

Yours faithfully,

{{USER_NAME}}
Contact: {{USER_PHONE}}
Date: {{TODAY_DATE}}`;

export const SBI_L2_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'BANK_NAME',
  'BRANCH_CITY',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'FREEZE_DATE',
  'NCRP_ID',
  'NODAL_EMAIL',
  'L1_SENT_DATE',
  'USER_PHONE',
] as const;
