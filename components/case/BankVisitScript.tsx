'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  freezeType?: string | null;
  ncrpId?: string | null;
  amountInr?: string | null;
};

type Section = {
  title: string;
  emoji: string;
  items: string[];
  highlight?: boolean;
};

export function BankVisitScript({ freezeType, ncrpId, amountInr }: Props) {
  const [open, setOpen] = useState(false);

  const sections: Section[] = [
    {
      title: 'Documents to bring',
      emoji: '📁',
      items: [
        'Freeze SMS or notice from the bank (printed or on phone)',
        'Bank account passbook or statement showing the freeze / lien entry',
        `NCRP acknowledgement copy${ncrpId ? ` (Ref: ${ncrpId})` : ' (if you filed a cybercrime complaint)'}`,
        'Aadhaar card — show only, mask all but last 4 digits when photocopying',
        'PAN card — masked copy',
        'Salary slips or income proof (last 2–3 months)',
        'Any UPI/transaction proof showing the disputed payment',
        'Printed copy of this L1 letter (sign it before you go)',
        'Blank paper and pen to note names and reference numbers',
      ],
    },
    {
      title: 'What to say at the counter',
      emoji: '🗣️',
      highlight: true,
      items: [
        '"My account has a debit freeze / lien. I am here to submit a formal written representation."',
        '"Please give me the freeze details in writing — the exact amount, the authority that ordered it, and the NCRP complaint number."',
        '"I am an innocent account holder and I did not send or receive this money knowingly."',
        amountInr
          ? `"The disputed amount is Rs. ${amountInr}. I am requesting that the rest of my balance be released and only this amount remains on lien."`
          : '"Please confirm the exact disputed amount and limit the freeze to that amount only — not my full balance."',
        '"I am also requesting that this complaint be registered under the bank\'s GRM (Grievance Redressal Mechanism)."',
        '"Please give me a written acknowledgement with a grievance reference number."',
      ],
    },
    {
      title: 'What NOT to say',
      emoji: '🚫',
      items: [
        'Do not argue or raise your voice — stay calm and professional.',
        'Do not sign any document you have not read carefully.',
        'Do not pay any "fees" to the branch to unfreeze — there are no legal fees for this.',
        'Do not hand over your full Aadhaar, PIN, OTP, or net banking password to anyone.',
        'Do not leave without a written acknowledgement or receipt.',
      ],
    },
    {
      title: 'Questions to ask the branch manager',
      emoji: '❓',
      items: [
        '1. Which authority issued the freeze order (NCRP, cyber cell, IO name)?',
        '2. What is the exact disputed amount? Is my full account frozen or only a lien?',
        '3. What is the NCRP / FIR complaint number?',
        '4. Under which legal section was the freeze applied (e.g., BNSS Section 106)?',
        '5. Who is the Investigating Officer (IO) and how do I contact them?',
        '6. Has my grievance been forwarded to the CFCFRMS / GRM module?',
        '7. When should I expect a response?',
      ],
    },
    {
      title: 'Timeline — what to expect',
      emoji: '📅',
      items: [
        'Today: Submit the L1 letter. Get a written acknowledgement with date and reference.',
        'Within 7 days: Bank should forward your grievance into the CFCFRMS system (per MHA SOP 2026).',
        'Within 15 days: The Investigating Officer should take a decision (video verification possible).',
        'If no response in 15 days: Escalate to the District Grievance Officer (Addl. SP / DySP) automatically.',
        'After 30 days of no resolution: You can file with the RBI Ombudsman at cms.rbi.org.in (free).',
        '90-day cap: If no court order is given, the bank may lift the hold after 90 days (per SOP).',
      ],
    },
    {
      title: 'Scam warnings',
      emoji: '⚠️',
      items: [
        'NEVER pay any agent, lawyer, or caller who promises to unfreeze your account for a fee. Official routes are free.',
        'The police will NOT call you asking for payment to release your account.',
        'Do not share OTPs, PINs, card numbers, or net-banking passwords with anyone.',
        'Only use official portals: cybercrime.gov.in, 1930, ncrp-grievanceredressal.mha.gov.in, cms.rbi.org.in.',
      ],
    },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">🏦 Help me prepare for my bank visit</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">What to say, what to bring, what to ask — step by step.</p>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 flex-none text-[var(--ink-faint)]" />
        ) : (
          <ChevronDown className="h-4 w-4 flex-none text-[var(--ink-faint)]" />
        )}
      </button>

      {open ? (
        <div className="border-t border-[var(--border)] px-4 pb-5 pt-4 space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">
            Go to your <strong>home branch</strong> in person. Bring everything below and stay calm.
            Your goal today: submit the letter, get a written acknowledgement, and note the grievance reference number.
          </p>

          {sections.map((s) => (
            <div
              key={s.title}
              className={`rounded-lg border p-3.5 space-y-2 ${
                s.highlight
                  ? 'border-[var(--forest)]/20 bg-[var(--forest-muted)]'
                  : 'border-[var(--border)] bg-white'
              }`}
            >
              <p className="text-sm font-semibold text-[var(--ink)]">
                {s.emoji} {s.title}
              </p>
              <ul className="space-y-1.5">
                {s.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--ink-muted)]">
                    <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-[var(--ink-faint)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="text-xs text-[var(--ink-faint)] pt-1">
            Unhold does not contact the bank, police, or GRM for you. This guide is for information only — not legal advice.
          </p>
        </div>
      ) : null}
    </div>
  );
}
