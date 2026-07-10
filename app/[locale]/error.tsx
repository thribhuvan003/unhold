'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations('Errors.appError');
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-[430px] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="type-display-xl text-[1.5rem]">{t('title')}</h1>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t('body')}</p>
      <button
        type="button"
        onClick={reset}
        className="u-btn u-btn-primary min-h-[48px] px-6 text-sm font-semibold"
      >
        {t('tryAgain')}
      </button>
      <Link href="/my-case" className="min-h-[44px] text-sm font-medium text-[var(--ink-muted)] underline">
        {t('backToCase')}
      </Link>
    </main>
  );
}
