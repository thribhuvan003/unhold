'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

export function BankVisitScript({ ncrpId, amountInr }: Props) {
  const [open, setOpen] = useState(false);
  const t = useTranslations('BankVisitScript');

  const docsRaw = t.raw('docs') as string[];
  const sayRaw = t.raw('say') as string[];

  // The NCRP-with-ref (docs[3]) and amount (say[4]) variants replace their
  // generic siblings only when we actually have that value.
  const docs = [
    docsRaw[0],
    docsRaw[1],
    ncrpId ? docsRaw[3].replace('{ncrpId}', ncrpId) : docsRaw[2],
    docsRaw[4],
    docsRaw[5],
    docsRaw[6],
    docsRaw[7],
    docsRaw[8],
    docsRaw[9],
  ];
  const say = [
    sayRaw[0],
    sayRaw[1],
    sayRaw[2],
    amountInr ? sayRaw[4].replace('{amountInr}', amountInr) : sayRaw[3],
    sayRaw[5],
    sayRaw[6],
  ];

  const sections: Section[] = [
    { title: t('docsTitle'), emoji: '📁', items: docs },
    { title: t('sayTitle'), emoji: '🗣️', highlight: true, items: say },
    { title: t('dontTitle'), emoji: '🚫', items: t.raw('dont') as string[] },
    { title: t('questionsTitle'), emoji: '❓', items: t.raw('questions') as string[] },
    { title: t('timelineTitle'), emoji: '📅', items: t.raw('timeline') as string[] },
    { title: t('warningsTitle'), emoji: '⚠️', items: t.raw('warnings') as string[] },
  ];

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">{t('toggleTitle')}</p>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">{t('toggleDesc')}</p>
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
            {t.rich('intro', { strong: (chunks) => <strong>{chunks}</strong> })}
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

          <p className="text-xs text-[var(--ink-faint)] pt-1">{t('disclaimer')}</p>
        </div>
      ) : null}
    </div>
  );
}
