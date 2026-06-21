export const SBI_L2_TEMPLATE_SLUG = 'sbi_nodal_escalation';

export const SBI_L2_SUBJECT = 'Escalation — No response to branch complaint dated {{L1_SENT_DATE}}';

export const SBI_L2_BODY = `To,
Nodal Officer — {{BANK_NAME}}
Email: {{NODAL_EMAIL}}

Subject: Escalation — No response to branch complaint dated {{L1_SENT_DATE}}

Dear Sir/Madam,

I had submitted a request for lien/debit freeze release to the {{BRANCH_CITY}} branch on {{L1_SENT_DATE}} (Account XXXXXX{{ACCOUNT_LAST4}}, NCRP {{NCRP_ID}}). No satisfactory response has been received within the prescribed period.

I request your intervention to direct the branch to release the freeze of Rs. {{AMOUNT_INR}}.

Yours faithfully,
{{USER_NAME}}
{{USER_PHONE}}`;

export const SBI_L2_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'BANK_NAME',
  'BRANCH_CITY',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'NCRP_ID',
  'NODAL_EMAIL',
  'L1_SENT_DATE',
  'USER_PHONE',
] as const;