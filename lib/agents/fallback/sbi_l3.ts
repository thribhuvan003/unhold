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

Nature of complaint: Alleged deficiency in service by {{BANK_NAME}} — the bank has not given an adequate written response to my requests for the restriction details and its grievance handling. I understand RBI CMS cannot override a restriction ordered by a police, court or tax authority; this draft concerns only the bank's own service and must meet the current RBI scheme's eligibility rules.

Facts: On {{FREEZE_DATE}}, my account was frozen (NCRP ref {{NCRP_ID}}, disputed amount approx. Rs. {{AMOUNT_INR}}). I wrote to the branch on {{L1_SENT_DATE}} and escalated to the Nodal Officer on {{L2_SENT_DATE}}. {{SITUATION_LINE}} I have received no satisfactory response since.

{{LEGAL_GROUNDING}}

I request RBI CMS, if this complaint is eligible, to consider directing {{BANK_NAME}} to:
1. Provide the written restriction details: amount, type, scope, ordering authority, reference and the bank's grievance record. {{AMOUNT_RULE_LINE}}
2. Explain whether the bank implemented the written authority direction correctly and give the current status and next bank-service step.
3. Consider any relief available under the current scheme for the bank-service deficiency established on the facts.

I first took this up with the bank — a written representation to the branch on {{L1_SENT_DATE}} and an escalation to the Nodal Officer on {{L2_SENT_DATE}} — and did not receive a satisfactory written response. I will verify eligibility and current filing requirements on the official RBI CMS site before submitting this draft.

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
