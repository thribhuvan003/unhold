import { useTranslations } from 'next-intl';

type TimelineRow = { when: string; title: string; desc: string };

/** Shown only after Letter 1 is sent — what the official process expects next. */
export function WhatHappensNextCard() {
  const t = useTranslations('WhatHappensNextCard');
  const timeline = t.raw('timeline') as TimelineRow[];
  return (
    <section data-testid="what-happens-next" className="u-card p-4">
      <p className="type-eyebrow">{t('title')}</p>
      <div className="mt-3 flex flex-col gap-3">
        {timeline.map((row) => (
          <div key={row.when} className="flex items-start gap-3">
            <span className="w-16 flex-none pt-0.5 text-[0.6875rem] font-bold uppercase tracking-wide text-[#2f7fc0]">
              {row.when}
            </span>
            <div className="min-w-0 border-l-2 border-[var(--color-sky-mist)] pl-3">
              <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">{row.title}</p>
              <p className="mt-0.5 text-[0.78125rem] leading-normal text-[var(--ink-muted)]">{row.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
