import type { Metadata } from 'next';
import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Phone } from 'lucide-react';
import { BankVisitScript } from '@/components/case/BankVisitScript';

export const metadata: Metadata = {
  title: 'Help & staying safe — Unhold',
  description:
    'The official 1930 cyber helpline, your rights guide, branch-visit preparation, official websites, scam warnings, and bank words in plain words.',
};

const OFFICIAL_LINKS = [
  { key: 'ncrp', href: 'https://www.cybercrime.gov.in/' },
  { key: 'mrm', href: 'https://mrm-ncrp.mha.gov.in/' },
  { key: 'ombudsman', href: 'https://cms.rbi.org.in' },
] as const;

type Props = { params: Promise<{ locale: string }> };

export default async function HelpPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('HelpPage');
  const scams = t.raw('scams') as string[];
  const glossary = t.raw('glossary') as { term: string; plain: string }[];

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-3.5">
      <h1 className="type-display-xl animate-fade-up text-[1.625rem]">{t('title')}</h1>

      <a href="tel:1930" className="u-card flex items-center gap-3 p-4 no-underline">
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-sky-mist)]">
          <Phone className="h-4 w-4 text-[var(--color-sky-deep)]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="flex-1">
          <span className="block text-[0.90625rem] font-semibold text-[var(--ink)]">
            {t('call1930Title')}
          </span>
          <span className="mt-px block text-[0.78125rem] text-[var(--ink-faint)]">
            {t('call1930Desc')}
          </span>
        </span>
      </a>

      <Link
        href="/guides/sop-2026"
        className="flex w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/7 px-4 py-3.5 text-left no-underline"
      >
        <span className="flex-1">
          <span className="block text-sm font-bold text-[var(--ink)]">{t('rightsTitle')}</span>
          <span className="mt-0.5 block text-[0.78125rem] leading-normal text-[var(--ink-muted)]">
            {t('rightsDesc')}
          </span>
        </span>
        <span className="flex-none text-base text-[var(--success)]" aria-hidden="true">
          →
        </span>
      </Link>

      <BankVisitScript />

      <Link
        href="/open-case"
        className="u-card block p-4 no-underline"
      >
        <span className="block text-sm font-bold text-[var(--ink)]">{t('recoverTitle')}</span>
        <span className="mt-0.5 block text-[0.78125rem] leading-normal text-[var(--ink-muted)]">
          {t('recoverDesc')}
        </span>
      </Link>

      <section className="u-card p-4">
        <p className="text-sm font-bold text-[var(--ink)]">{t('whatsappTitle')}</p>
        <p className="mt-1 text-[0.78125rem] leading-relaxed text-[var(--ink-muted)]">
          {t('whatsappDesc')}
        </p>
      </section>

      <section className="u-card p-4">
        <p className="type-eyebrow">{t('officialTitle')}</p>
        <div className="mt-2.5 flex flex-col gap-2">
          {OFFICIAL_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-[0.84375rem] font-medium text-[var(--color-sky-deep)] no-underline"
            >
              <span>{t(`links.${l.key}`)}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--error)]/22 bg-[var(--error)]/5 p-4">
        <p className="type-eyebrow text-[var(--error)]">{t('scamTitle')}</p>
        <ul className="mt-2.5 flex list-disc flex-col gap-1.5 pl-4 text-[0.84375rem] leading-relaxed text-[var(--ink)]">
          {scams.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </section>

      <section className="u-card p-4">
        <p className="type-eyebrow">{t('glossaryTitle')}</p>
        <div className="mt-2.5 flex flex-col gap-2">
          {glossary.map((g) => (
            <div key={g.term} className="border-b border-[var(--surface)] pb-2 last:border-b-0 last:pb-0">
              <p className="type-mono-data text-xs text-ink-faint">{g.term}</p>
              <p className="mt-0.5 text-[0.84375rem] font-medium text-[var(--ink)]">{g.plain}</p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
