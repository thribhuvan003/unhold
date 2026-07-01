export const SBI_L1_TEMPLATE_SLUG = 'sbi_branch_lien_release';

export const SBI_L1_SUBJECT =
  'Request for review of lien / debit freeze and release of undisputed funds — A/c No. XXXXXX{{ACCOUNT_LAST4}}';

export const SBI_L1_BODY = `Date: {{FREEZE_DATE}}

To,
The Branch Manager
{{BANK_NAME}}
{{BRANCH_CITY}} Branch

Subject: Request for review of lien / debit freeze and release of undisputed funds
         A/c No. XXXXXX{{ACCOUNT_LAST4}} — NCRP Ref: {{NCRP_ID}}

Respected Sir / Madam,

I, {{USER_NAME}}, am a savings account holder at your branch (Account No. XXXXXX{{ACCOUNT_LAST4}}). I am writing to bring to your urgent attention a debit freeze / lien that has been placed on my account, and to request an immediate review and release of the undisputed portion of my funds.

────────────────────────────────────────
1. ACCOUNT AND FREEZE DETAILS
────────────────────────────────────────

Account holder  : {{USER_NAME}}
Account number  : XXXXXX{{ACCOUNT_LAST4}} (last 4 digits only, for security)
Bank & branch   : {{BANK_NAME}}, {{BRANCH_CITY}}
Freeze date     : {{FREEZE_DATE}}
NCRP reference  : {{NCRP_ID}}
Disputed amount : Rs. {{AMOUNT_INR}} (approx.)
Contact         : {{USER_PHONE}}

────────────────────────────────────────
2. BACKGROUND AND TIMELINE
────────────────────────────────────────

On {{FREEZE_DATE}}, I discovered that my account had been placed under a debit
freeze / lien, apparently pursuant to a communication or directive received by
the bank from the National Cyber Crime Reporting Portal (NCRP) / Cyber Cell,
referencing complaint number {{NCRP_ID}}.

I was not informed of this freeze in advance, nor was I given an opportunity to
present my position before the freeze was applied. I learned of the restriction
only when a transaction was declined / I checked my account balance.

I have not received any formal written communication from the bank or the
investigating authority specifying:
  (a) the exact amount placed under lien,
  (b) the specific transaction(s) in dispute,
  (c) the legal provision under which the freeze was imposed, and
  (d) the Investigating Officer's name, designation, and contact details.

────────────────────────────────────────
3. MY POSITION
────────────────────────────────────────

I am an innocent account holder. I had no prior knowledge of, or involvement
in, any fraudulent activity. Any funds that may have passed through my account
were received in the ordinary course of my legitimate transactions. I have no
connection to the alleged fraud and did not knowingly receive proceeds of any
crime.

I understand that under the MHA / I4C Account-Freeze SOP (02-Jan-2026) and
recent High Court judgments (including Bombay HC — Kartik Chatur, 2025; Delhi
HC — Malabar Gold, 2026), a blanket debit freeze of an innocent downstream
account holder is not legally sustainable. Only the specific disputed amount
should be held under lien; the undisputed balance should be released.

────────────────────────────────────────
4. REQUESTS
────────────────────────────────────────

I respectfully request the following:

4.1 WRITTEN FREEZE DETAILS
    Please provide, in writing within 7 working days:
    (a) The authority / agency that issued the freeze directive;
    (b) The specific disputed amount placed under lien;
    (c) The legal provision relied upon (e.g., Section 106 BNSS, 2023);
    (d) The NCRP complaint number and the Investigating Officer's contact.

4.2 LIEN-ONLY REVIEW
    If the full account has been frozen but only a portion is disputed, I
    request that the freeze be reduced to a lien on the disputed amount only
    (Rs. {{AMOUNT_INR}}) and that the undisputed balance be released
    immediately, consistent with the MHA / I4C SOP 2026.

4.3 UNDERTAKING
    I undertake not to withdraw or transfer the disputed amount of
    Rs. {{AMOUNT_INR}} without the express written permission of the
    Investigating Officer or a competent court, as a gesture of good faith.

4.4 GRM / GRIEVANCE REDRESSAL
    I request that this representation be registered as a formal grievance
    under the bank's Grievance Redressal Mechanism and forwarded to the
    CFCFRMS module within 7 days, as required by the I4C SOP (02-Jan-2026),
    so that the Investigating Officer can take a decision within 15 days.

4.5 WRITTEN ACKNOWLEDGEMENT
    Kindly acknowledge receipt of this letter in writing and provide a
    grievance / tracking reference number.

────────────────────────────────────────
5. DOCUMENTS ENCLOSED (Annexures)
────────────────────────────────────────

Annexure A — Copy of freeze SMS / notice received from the bank
Annexure B — Bank account statement showing the freeze entry and lien mark
Annexure C — NCRP acknowledgement copy (if available)
Annexure D — Government-issued photo ID (Aadhaar card — last 4 digits only)
Annexure E — Proof of legitimate source of funds (salary slips / invoice /
              transaction receipts, as applicable)
Annexure F — Declaration of innocent receipt (signed, see below)

────────────────────────────────────────
6. DECLARATION
────────────────────────────────────────

I, {{USER_NAME}}, hereby solemnly declare that:

(a) I had no prior knowledge of any fraud or criminal activity associated
    with the funds in my account.
(b) I am not connected to the alleged complainant or the alleged perpetrators
    of the reported cybercrime.
(c) The funds in my account represent legitimate income / receipts.
(d) I am fully cooperating with the investigation and will provide any
    additional documents required.
(e) The statements made in this letter are true and correct to the best of
    my knowledge.

────────────────────────────────────────
7. ACKNOWLEDGEMENT REQUEST
────────────────────────────────────────

Kindly:
  — Acknowledge receipt of this letter with a date stamp and reference number;
  — Provide a written response within 7 working days; and
  — Forward this grievance to the concerned Investigating Officer / CFCFRMS
    portal and confirm the same in writing.

If I do not receive a satisfactory response within 30 days, I reserve the right
to escalate this matter to the Principal Nodal Officer, the Banking Ombudsman
(RBI CMS — cms.rbi.org.in, helpline 14448), and, if necessary, to the
appropriate court / High Court.

DRAFT ONLY — REVIEW BEFORE SENDING. UNHOLD DOES NOT SEND THIS FOR YOU.

Yours faithfully,

{{USER_NAME}}
Contact: {{USER_PHONE}}
Date: {{FREEZE_DATE}}

────────────────────────────────────────
ANNEXURE LIST (attach before submitting)
────────────────────────────────────────
[ ] Annexure A — Freeze SMS / notice
[ ] Annexure B — Bank statement with freeze entry
[ ] Annexure C — NCRP acknowledgement (if available)
[ ] Annexure D — Photo ID (masked Aadhaar — last 4 digits only)
[ ] Annexure E — Proof of legitimate funds
[ ] Annexure F — Signed declaration`;

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
