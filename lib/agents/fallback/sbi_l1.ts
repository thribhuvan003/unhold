export const SBI_L1_TEMPLATE_SLUG = 'sbi_branch_lien_release';

export const SBI_L1_SUBJECT = 'Request for release of lien / debit freeze on Account No. XXXXXX{{ACCOUNT_LAST4}}';

export const SBI_L1_BODY = `To,
The Branch Manager
{{BANK_NAME}} — {{BRANCH_CITY}} Branch

Subject: Request for release of lien / debit freeze on Account No. XXXXXX{{ACCOUNT_LAST4}}

Respected Sir/Madam,

I am {{USER_NAME}}, holder of the above savings/current account. A lien/debit freeze of Rs. {{AMOUNT_INR}} was applied on {{FREEZE_DATE}} (Ref: {{NCRP_ID}}).

I am an innocent receiver of a fraudulent UPI transaction and have filed NCRP complaint {{NCRP_ID}}. I request release of the lien under applicable RBI guidelines.

Enclosures: NCRP acknowledgement, bank SMS screenshot, ID proof.

Yours faithfully,
{{USER_NAME}}
{{USER_PHONE}}`;

export const SBI_L1_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'BANK_NAME',
  'BRANCH_CITY',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'FREEZE_DATE',
  'NCRP_ID',
  'USER_PHONE',
] as const;