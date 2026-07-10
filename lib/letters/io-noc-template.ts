/**
 * Investigating Officer / cyber-cell representation — the letter that asks for
 * the NOC / release that actually lifts a cyber freeze. Bank L1 only obtains
 * freeze details; this is the authority step the product was missing.
 *
 * Pure template fill — no LLM, no auto-send. User copies/prints and sends.
 */

export const IO_NOC_TEMPLATE_SLUG = 'io_cyber_noc_request';

export const IO_NOC_SUBJECT =
  'Representation for NOC / release order — bank account freeze — NCRP / complaint ref {{NCRP_ID}} — A/c XXXXXX{{ACCOUNT_LAST4}}';

export const IO_NOC_BODY = `Date: {{TODAY_DATE}}

From:
{{USER_NAME}}
{{USER_ADDRESS}}
Phone: {{USER_PHONE}}

To,
The Investigating Officer / Station House Officer
{{POLICE_STATION}}
(Cyber cell / police station that ordered the freeze)

Subject: Request for written NOC / release order under BNSS Section 106(3) — freeze on A/c XXXXXX{{ACCOUNT_LAST4}} at {{BANK_NAME}} — NCRP / complaint ref {{NCRP_ID}}

Respected Sir / Madam,

1. I, {{USER_NAME}}, am the holder of savings account XXXXXX{{ACCOUNT_LAST4}} with {{BANK_NAME}}. Around {{FREEZE_DATE}}, my account was placed under a freeze / lien (disputed / held amount approx. Rs. {{AMOUNT_INR}}).

2. I understand this freeze was ordered by your office / cyber cell in connection with a cyber-fraud trail (NCRP / complaint reference: {{NCRP_ID}}). I am an innocent account holder. I did not participate in any fraud. Any disputed credit was not knowingly received for a fraudulent purpose.

3. I have already written to my bank for the exact freeze details (authority, FIR/NCRP number, amount held, and whether the hold is a lien or a full freeze). I am cooperating fully.

4. Under the MHA/I4C SOP (January 2026), a hold should be limited to the disputed amount. A full debit freeze is not the default tool for a mere lien situation. Where investigation finds no involvement, the police may send the bank a Section 106(3) BNSS release notice / NOC so the bank can lift the hold.

I therefore request you to, within the SOP timeline (about 15 days where applicable):
(a) Confirm in writing the complaint number, the exact amount ordered to be held, and my status in the investigation;
(b) If I am not an accused / if there is no material against me, issue a written NOC / no-objection / Section 106(3) release direction to {{BANK_NAME}} so the freeze or excess lien on my account is lifted;
(c) If video verification or further documents are required, inform me of the date, mode, and list of papers.

Enclosed (as available): bank freeze SMS/notice, account statement showing the disputed credit and my normal activity, masked ID, and proof of legitimate funds (salary / invoice / family transfer as applicable).

I request a stamped acknowledgement or email reply with a reference number.

Yours faithfully,

{{USER_NAME}}
Phone: {{USER_PHONE}}
Date: {{TODAY_DATE}}`;

export type IoNocValues = {
  USER_NAME?: string;
  USER_ADDRESS?: string;
  USER_PHONE?: string;
  BANK_NAME?: string;
  ACCOUNT_LAST4?: string;
  AMOUNT_INR?: string;
  FREEZE_DATE?: string;
  NCRP_ID?: string;
  POLICE_STATION?: string;
  TODAY_DATE?: string;
};

const BLANK: Record<string, string> = {
  USER_NAME: 'your full name',
  USER_ADDRESS: 'your address',
  USER_PHONE: 'your phone',
  BANK_NAME: 'your bank',
  ACCOUNT_LAST4: 'last 4 digits',
  AMOUNT_INR: 'amount',
  FREEZE_DATE: 'freeze date',
  NCRP_ID: 'NCRP / complaint number, if any',
  POLICE_STATION: 'cyber cell / police station name & address (from bank letter)',
  TODAY_DATE: 'today’s date',
};

function fill(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_m, key: string) => {
    const v = values[key]?.trim();
    if (v) return v;
    const label = BLANK[key];
    return label ? `__________ (${label})` : '__________';
  });
}

export function buildIoNocLetter(values: IoNocValues): { subject: string; body: string } {
  const today =
    values.TODAY_DATE?.trim() ||
    new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  const filled: Record<string, string> = {
    TODAY_DATE: today,
    USER_NAME: values.USER_NAME ?? '',
    USER_ADDRESS: values.USER_ADDRESS ?? '',
    USER_PHONE: values.USER_PHONE ?? '',
    BANK_NAME: values.BANK_NAME ?? '',
    ACCOUNT_LAST4: values.ACCOUNT_LAST4 ?? '',
    AMOUNT_INR: values.AMOUNT_INR ?? '',
    FREEZE_DATE: values.FREEZE_DATE ?? '',
    NCRP_ID: values.NCRP_ID ?? '',
    POLICE_STATION: values.POLICE_STATION ?? '',
  };
  return {
    subject: fill(IO_NOC_SUBJECT, filled),
    body: fill(IO_NOC_BODY, filled),
  };
}

/** Official GRM portal for wrongly frozen cyber-linked accounts (verified contacts). */
export const GRM_PORTAL_URL = 'https://ncrp-grievanceredressal.mha.gov.in/';
