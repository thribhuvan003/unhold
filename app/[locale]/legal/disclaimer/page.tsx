import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DISCLAIMER_BLOCKS } from '@/lib/constants/disclaimers';

type Props = { params: Promise<{ locale: string }> };

export default async function DisclaimerPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('LegalDisclaimer');

  return (
    <section className="mx-auto max-w-3xl">
      <header className="animate-fade-up">
        <p className="type-eyebrow">{t('eyebrow')}</p>
        <h1 className="type-display mt-2 text-3xl">{t('title')}</h1>
        <Link
          href="/legal/privacy"
          className="mt-2 inline-block text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4"
        >
          {t('privacyLink')}
        </Link>
      </header>

      <div className="mt-6 space-y-3">
        {(Object.entries(DISCLAIMER_BLOCKS) as [string, string][]).map(([id, text]) => (
          <article key={id} className="u-card animate-fade-up p-4 sm:p-5">
            <h2 className="type-display text-[0.9375rem]">
              {t.has(`headings.${id}`) ? t(`headings.${id}`) : t('sectionFallback', { id })}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
