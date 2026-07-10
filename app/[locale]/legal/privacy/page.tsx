import { Link } from '@/i18n/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { DISCLAIMER_BLOCKS } from '@/lib/constants/disclaimers';

type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('LegalPrivacy');

  // The two middle blocks are the authoritative shared disclaimer constants
  // (kept verbatim); the framing blocks are translated.
  const blocks: string[] = [t('block1'), DISCLAIMER_BLOCKS.F, DISCLAIMER_BLOCKS.G, t('block4')];

  return (
    <section className="mx-auto max-w-3xl">
      <header className="animate-fade-up">
        <p className="type-eyebrow">{t('eyebrow')}</p>
        <h1 className="type-display mt-2 text-3xl">{t('title')}</h1>
        <Link
          href="/legal/disclaimer"
          className="mt-2 inline-block text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4"
        >
          {t('disclaimerLink')}
        </Link>
      </header>

      <div className="mt-6 space-y-4">
        {blocks.map((text, i) => (
          <div key={i} className="animate-fade-up flex gap-3">
            <span className="type-mono-data flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#e5eef7] text-xs font-medium text-[#2f7fc0]">
              {i + 1}
            </span>
            <p className="mt-0.5 text-sm leading-relaxed text-[var(--ink-muted)]">{text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
