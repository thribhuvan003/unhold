/** Bank-agnostic RBI Ombudsman / CMS draft (any bank). */
export const SBI_L3_TEMPLATE_SLUG = 'rbi_ombudsman';
/** @deprecated alias — same as SBI_L3_TEMPLATE_SLUG */
export const L3_TEMPLATE_SLUG = SBI_L3_TEMPLATE_SLUG;

export const SBI_L3_SUBJECT =
  'Complaint for Banking Ombudsman (RBI CMS) — {{BANK_NAME}} — Unresolved lien on A/c XXXXXX{{ACCOUNT_LAST4}} — Deficiency in service';

export const SBI_L3_BODY = `COMPLAINT FOR RBI BANKING OMBUDSMAN / CMS
(File online at: cms.rbi.org.in | Helpline: 14448)

This is a DRAFT for your review — file it yourself at cms.rbi.org.in. Unhold does not file this for you.

Complainant  : {{USER_NAME}} | Contact: {{USER_PHONE}}
Account      : XXXXXX{{ACCOUNT_LAST4}}, {{BANK_NAME}}, {{BRANCH_CITY}}

Nature of complaint: Deficiency in service by {{BANK_NAME}} — it has held a lien beyond the disputed amount and has not responded to two written representations, contrary to its grievance-redressal obligations under the RBI framework. (I understand the Ombudsman cannot override a freeze ordered by an investigating agency; this complaint concerns the bank's own conduct.)

Facts: On {{FREEZE_DATE}}, my account was frozen (NCRP ref {{NCRP_ID}}, disputed amount approx. Rs. {{AMOUNT_INR}}). I wrote to the branch on {{L1_SENT_DATE}} and escalated to the Nodal Officer on {{L2_SENT_DATE}}. {{SITUATION_LINE}} I have received no satisfactory response since.

{{LEGAL_GROUNDING}}

I request the Ombudsman to direct {{BANK_NAME}}, for this deficiency in service, to:
1. Restrict any lien to the disputed amount and lift the hold on the balance above it — the bank's own excess, which does not need the investigating agency's approval. {{AMOUNT_RULE_LINE}}
2. Provide the written freeze details and confirm my representation was forwarded to the CFCFRMS/GRM module, with the tracking reference.
3. Compensate for the delay and hardship caused by its unresponsiveness.

I first took this up with the bank — a written representation to the branch on {{L1_SENT_DATE}} and an escalation to the Nodal Officer on {{L2_SENT_DATE}} — and did not receive a satisfactory resolution within the required period, which is why I now approach the Ombudsman.

Attached: L1 letter ({{L1_SENT_DATE}}), L2 escalation ({{L2_SENT_DATE}}), freeze notice, bank statement, NCRP acknowledgement (if available), and photo ID (masked). {{DECLARATION_LINE}} I have not filed a complaint on the same matter before any other authority.

Complainant: {{USER_NAME}}
Date: {{TODAY_DATE}}`;

export const SBI_L3_REQUIRED_PLACEHOLDERS = [
  'USER_NAME',
  'BANK_NAME',
  'BRANCH_CITY',
  'ACCOUNT_LAST4',
  'AMOUNT_INR',
  'FREEZE_DATE',
  'NCRP_ID',
  'L1_SENT_DATE',
  'L2_SENT_DATE',
  'USER_PHONE',
] as const;
