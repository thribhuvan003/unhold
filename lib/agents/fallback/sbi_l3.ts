export const SBI_L3_TEMPLATE_SLUG = 'rbi_ombudsman_sbi';

export const SBI_L3_SUBJECT =
  'Complaint for Banking Ombudsman (RBI CMS) — {{BANK_NAME}} — Unresolved lien on A/c XXXXXX{{ACCOUNT_LAST4}} — Deficiency in service';

export const SBI_L3_BODY = `COMPLAINT FOR RBI BANKING OMBUDSMAN / CMS
(File online at: cms.rbi.org.in | Helpline: 14448)

IMPORTANT: This is a DRAFT for your review. File it yourself at cms.rbi.org.in.
Unhold does not file this for you. Nothing is sent automatically.

────────────────────────────────────────
COMPLAINANT DETAILS
────────────────────────────────────────

Full name     : {{USER_NAME}}
Contact       : {{USER_PHONE}}
Account no.   : XXXXXX{{ACCOUNT_LAST4}} (last 4 digits only)
Bank          : {{BANK_NAME}}
Branch        : {{BRANCH_CITY}}

────────────────────────────────────────
COMPLAINT SUMMARY
────────────────────────────────────────

Nature of complaint: Failure to resolve lien / debit freeze within the
prescribed timeframe despite two formal representations; continued restriction
of access to undisputed funds in violation of the MHA / I4C SOP (02-Jan-2026).

────────────────────────────────────────
1. FACTS OF THE CASE
────────────────────────────────────────

1.1  On {{FREEZE_DATE}}, a lien / debit freeze of Rs. {{AMOUNT_INR}} was
     placed on my account (XXXXXX{{ACCOUNT_LAST4}}) at {{BANK_NAME}},
     {{BRANCH_CITY}} Branch, pursuant to NCRP complaint {{NCRP_ID}}.

1.2  I am an innocent account holder with no connection to the alleged fraud.
     I had no knowledge of any criminal activity associated with the funds.

1.3  On {{L1_SENT_DATE}}, I submitted a formal written representation to the
     branch, requesting freeze details and release of the undisputed balance.

1.4  On {{L2_SENT_DATE}}, I escalated the matter in writing to the Nodal
     Officer of {{BANK_NAME}} (email: {{NODAL_EMAIL}}).

1.5  Despite {{L2_SENT_DATE}} (over 30 days since my initial representation),
     I have not received a satisfactory written response from the bank, and the
     freeze continues in full.

────────────────────────────────────────
2. DEFICIENCY IN SERVICE ALLEGED
────────────────────────────────────────

(a)  Failure to provide written freeze details (disputed amount, legal basis,
     IO contact) within 7 days as required by the MHA / I4C SOP (02-Jan-2026).

(b)  Failure to forward my grievance to the CFCFRMS module within 7 days.

(c)  Failure to restrict the freeze to the disputed amount only, in
     violation of the lien-only principle upheld by multiple High Courts
     (Bombay HC, 2025; Delhi HC, 2026).

(d)  Continued denial of access to my own undisputed funds, causing financial
     hardship.

────────────────────────────────────────
3. RELIEF SOUGHT
────────────────────────────────────────

I request the Banking Ombudsman / RBI CMS to direct {{BANK_NAME}} to:

(a)  Release the undisputed portion of the freeze immediately;
(b)  Confine any lien to the disputed amount of Rs. {{AMOUNT_INR}} only;
(c)  Provide written freeze details and the IO's contact;
(d)  Pay compensation for loss / inconvenience caused by the delay; and
(e)  Ensure the GRM / CFCFRMS process is completed within the SOP timelines.

────────────────────────────────────────
4. DOCUMENTS TO ATTACH (when filing online)
────────────────────────────────────────

[ ] Copy of L1 branch letter dated {{L1_SENT_DATE}}
[ ] Copy of L2 nodal escalation dated {{L2_SENT_DATE}}
[ ] Freeze SMS / notice from bank
[ ] Bank statement showing freeze entry
[ ] NCRP acknowledgement (if available)
[ ] Photo ID (masked Aadhaar — last 4 digits only)
[ ] Any bank response received (or note confirming no response)

────────────────────────────────────────
5. DECLARATION
────────────────────────────────────────

I declare that:
  — I am an innocent account holder with no connection to the alleged fraud;
  — The information above is true and correct to the best of my knowledge;
  — I have exhausted the bank's internal grievance process (L1 + L2);
  — I have not filed a complaint on the same matter before any other authority.

DRAFT ONLY — REVIEW BEFORE FILING. UNHOLD DOES NOT FILE THIS FOR YOU.
File at: cms.rbi.org.in | Helpline: 14448

Complainant: {{USER_NAME}}
Date: {{L2_SENT_DATE}}`;

export const SBI_L3_REQUIRED_PLACEHOLDERS = [
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
