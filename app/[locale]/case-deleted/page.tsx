import { ShieldCheck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

type Props = { params: Promise<{ locale: string }> };

export default async function CaseDeletedPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('DataRightsCard');

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-4">
      <div className="u-card px-5 py-7 text-center">
        <ShieldCheck className="mx-auto h-9 w-9 text-[var(--success)]" aria-hidden="true" />
        <h1 className="type-display-xl mt-3 text-2xl">{t('confirmationTitle')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
          {t('confirmationBody')}
        </p>
        <Link href="/" className="u-btn u-btn-primary mt-5 inline-flex min-h-[46px] items-center px-5">
          {t('confirmationHome')}
        </Link>
      </div>
    </section>
  );
}
