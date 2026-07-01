export const SBI_L2_TEMPLATE_SLUG = 'sbi_nodal_escalation';

export const SBI_L2_SUBJECT =
  'Formal escalation to Nodal Officer — Unresolved lien / debit freeze on A/c XXXXXX{{ACCOUNT_LAST4}} — L1 complaint dated {{L1_SENT_DATE}}';

export const SBI_L2_BODY = `Date: {{L2_SENT_DATE}}

To,
The Nodal Officer / Principal Grievance Officer
{{BANK_NAME}}
Email: {{NODAL_EMAIL}}

Subject: Formal escalation — Unresolved lien / debit freeze on A/c XXXXXX{{ACCOUNT_LAST4}}
         L1 branch complaint dated {{L1_SENT_DATE}} — NCRP Ref: {{NCRP_ID}}

Respected Sir / Madam,

I, {{USER_NAME}}, am writing to formally escalate a grievance that remains
unresolved despite a written representation submitted to the {{BRANCH_CITY}}
branch on {{L1_SENT_DATE}}.

────────────────────────────────────────
1. ACCOUNT AND PRIOR COMPLAINT DETAILS
────────────────────────────────────────

Account holder  : {{USER_NAME}}
Account number  : XXXXXX{{ACCOUNT_LAST4}} (last 4 digits only)
Bank & branch   : {{BANK_NAME}}, {{BRANCH_CITY}}
Freeze date     : {{FREEZE_DATE}}
NCRP reference  : {{NCRP_ID}}
Disputed amount : Rs. {{AMOUNT_INR}} (approx.)
L1 complaint on : {{L1_SENT_DATE}}
Contact         : {{USER_PHONE}}

────────────────────────────────────────
2. BACKGROUND
────────────────────────────────────────

A lien / debit freeze was placed on my account on {{FREEZE_DATE}} pursuant to
a directive linked to NCRP complaint {{NCRP_ID}}. I am an innocent account
holder with no connection to the alleged fraud.

On {{L1_SENT_DATE}}, I submitted a formal written representation to the
{{BRANCH_CITY}} branch, requesting:
  (a) written details of the freeze (disputed amount, IO contact, legal basis);
  (b) reduction of a blanket freeze to a lien on the disputed amount only; and
  (c) registration of the matter under the bank's GRM / CFCFRMS module.

To date, I have not received a satisfactory written response from the branch
within the 7-day period specified under the MHA / I4C Account-Freeze SOP
(02-Jan-2026). The disputed freeze continues to cause me severe financial
hardship, as {{AMOUNT_INR}} represents funds I need for essential expenses.

────────────────────────────────────────
3. LEGAL BASIS FOR ESCALATION
────────────────────────────────────────

Under the MHA / I4C Account-Freeze SOP (02-Jan-2026):
  — The bank must forward the grievance to CFCFRMS within 7 days of receipt.
  — The Investigating Officer must decide within 15 days.
  — If no response, the matter auto-escalates to the District Grievance Officer
    (Addl. SP / DySP) and then the State Grievance Officer (ADG / IG / DIG).

Multiple High Courts (Bombay HC, 2025; Delhi HC, 2026) have held that a blanket
debit freeze of an innocent downstream account holder is disproportionate and
that only the disputed amount should be held under lien.

────────────────────────────────────────
4. REQUESTS TO NODAL OFFICER
────────────────────────────────────────

I respectfully request:

4.1  Direct the {{BRANCH_CITY}} branch to provide written freeze details within
     7 days (disputed amount, legal basis, IO contact).

4.2  Intervene to ensure the freeze is reduced to a lien on the disputed
     amount of Rs. {{AMOUNT_INR}} only, with the undisputed balance released
     immediately.

4.3  Confirm that my L1 representation has been forwarded to the CFCFRMS /
     GRM module and provide the forwarding reference.

4.4  Acknowledge this escalation in writing and assign a grievance tracking
     number within 5 working days.

────────────────────────────────────────
5. DOCUMENTS ENCLOSED
────────────────────────────────────────

Annexure A — Copy of L1 branch letter dated {{L1_SENT_DATE}} (and proof of delivery if available)
Annexure B — Freeze SMS / notice from the bank
Annexure C — Bank statement showing freeze entry
Annexure D — NCRP acknowledgement copy (if available)
Annexure E — Photo ID (masked Aadhaar — last 4 digits only)

────────────────────────────────────────
6. DECLARATION
────────────────────────────────────────

I declare that I am an innocent account holder, that the information in this
letter is true and correct, and that I am cooperating fully with the
investigation.

DRAFT ONLY — REVIEW BEFORE SENDING. UNHOLD DOES NOT SEND THIS FOR YOU.

Yours faithfully,

{{USER_NAME}}
Contact: {{USER_PHONE}}
Date: {{L2_SENT_DATE}}

────────────────────────────────────────
ANNEXURE LIST (attach before submitting)
────────────────────────────────────────
[ ] Annexure A — L1 branch letter + delivery proof
[ ] Annexure B — Freeze SMS / notice
[ ] Annexure C — Bank statement
[ ] Annexure D — NCRP acknowledgement (if available)
[ ] Annexure E — Photo ID (masked Aadhaar)`;

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
  'L2_SENT_DATE',
  'USER_PHONE',
] as const;
