export const SBI_L3_TEMPLATE_SLUG = 'rbi_ombudsman_sbi';

export const SBI_L3_SUBJECT = 'Facts for RBI CMS filing — {{BANK_NAME}} lien on Account XXXXXX{{ACCOUNT_LAST4}}';

export const SBI_L3_BODY = `Facts for RBI CMS filing (user files manually at cms.rbi.org.in):

Bank: {{BANK_NAME}}
Account: XXXXXX{{ACCOUNT_LAST4}}
Amount frozen: Rs. {{AMOUNT_INR}}
NCRP: {{NCRP_ID}}
Freeze date: {{FREEZE_DATE}}

Prior escalations:
- Branch letter sent {{L1_SENT_DATE}}
- Nodal escalation sent {{L2_SENT_DATE}}

Complainant: {{USER_NAME}}
Phone: {{USER_PHONE}}

Summary: Innocent receiver of fraudulent UPI transaction; bank has not released lien despite branch and nodal escalations.`;

export const SBI_L3_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'BANK_NAME',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'NCRP_ID',
  'FREEZE_DATE',
  'L1_SENT_DATE',
  'L2_SENT_DATE',
  'USER_PHONE',
] as const;