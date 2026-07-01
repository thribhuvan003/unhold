'use client';

import { useState } from 'react';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { type ContactEntry, getBankContacts } from '@/lib/banks/official-contacts';

type Props = {
  bankSlug: string;
  targetLevel: 'L1' | 'L2' | 'L3';
  onSelectEmail?: (email: string) => void;
};

const LEVEL_COLORS: Record<string, string> = {
  L1: 'bg-[#e8f1fa] text-[#2f7fc0] border-[#d3e5f4]',
  L2: 'bg-amber-50 text-amber-700 border-amber-200',
  L3: 'bg-red-50 text-red-700 border-red-200',
  general: 'bg-[var(--surface)] text-[var(--ink-muted)] border-[var(--border)]',
};

function levelLabel(level: string): string {
  const map: Record<string, string> = {
    L1: 'First step',
    L2: 'Escalation',
    L3: 'Ombudsman',
    general: 'General',
  };
  return map[level] ?? level;
}

export function BankContactFinder({ bankSlug, targetLevel, onSelectEmail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const bank = getBankContacts(bankSlug);
  if (!bank) return null;

  const relevant = bank.contacts.filter(
    (c) => c.level === targetLevel || c.level === 'general',
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 flex-none text-[var(--forest)]" />
          <span className="text-sm font-semibold text-[var(--ink)]">
            Official contacts — {bank.bank_name}
          </span>
        </div>
        <span className="text-xs text-[var(--ink-faint)]">{expanded ? 'Hide' : 'Show contacts'}</span>
      </button>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-[var(--ink-muted)]">
            Sourced from official bank pages. Always <strong>verify with your branch</strong> before
            sending — contacts change. Never pay anyone for these contacts; they are public and free.
          </p>

          {relevant.map((c: ContactEntry, i: number) => (
            <div
              key={i}
              className="rounded-lg border border-[var(--border)] bg-white p-3 space-y-1.5"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_COLORS[c.level] ?? LEVEL_COLORS.general}`}>
                  {levelLabel(c.level)}
                </span>
                <span className="text-sm font-semibold text-[var(--ink)]">{c.role_plain}</span>
              </div>

              <p className="text-xs text-[var(--ink-faint)] italic">{c.role}</p>

              {c.email ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-[var(--ink-muted)]">Email:</span>
                  <code className="text-xs font-mono text-[var(--forest)]">{c.email}</code>
                  {onSelectEmail ? (
                    <button
                      type="button"
                      onClick={() => onSelectEmail(c.email!)}
                      className="rounded bg-[var(--forest-muted)] px-2 py-0.5 text-[10px] font-semibold text-[var(--forest)]"
                    >
                      Use this
                    </button>
                  ) : null}
                </div>
              ) : null}

              {c.phone ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  Phone: <a href={`tel:${c.phone.split('/')[0].trim().replace(/\s/g, '')}`} className="font-medium text-[var(--forest)]">{c.phone}</a>
                </p>
              ) : null}

              {c.portal ? (
                <p className="text-xs text-[var(--ink-muted)]">
                  Portal:{' '}
                  <a href={c.portal} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[#3684c8] underline underline-offset-2">
                    {c.portal.replace('https://', '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              ) : null}

              {c.notes ? (
                <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{c.notes}</p>
              ) : null}

              <p className="text-[10px] text-[var(--ink-faint)]">
                Source:{' '}
                <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-1">
                  official bank page
                </a>{' '}
                · Verified {c.verified_date}
              </p>
            </div>
          ))}

          <p className="text-[10px] text-[var(--ink-faint)] pt-1">
            ⚠️ Unhold is NOT affiliated with any bank. These contacts are sourced from public official pages.
            Verify with your branch before using. Never pay anyone for bank contact details.
          </p>
        </div>
      ) : null}
    </div>
  );
}
