'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const POLL_MS = 6_000;
const SLOW_AFTER_MS = 45_000;

/**
 * Shown while the draft is still being prepared. Auto-refreshes the
 * server-rendered page so the user is never stuck on a manual-refresh dead end.
 */
export function DraftPendingRefresh({ caseId, level }: { caseId: string; level: string }) {
  const t = useTranslations('DraftPendingRefresh');
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current ??= Date.now();
    const interval = setInterval(() => {
      if (startedAt.current !== null && Date.now() - startedAt.current > SLOW_AFTER_MS) {
        setSlow(true);
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="u-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-sky-deep)]" aria-hidden />
        <h1 className="type-display text-xl">{t('writingTitle', { level })}</h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t('writingBody')}</p>
      {slow ? (
        <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-muted)] px-4 py-3 text-sm text-[var(--ink)]">
          {t('slowNote')}
        </div>
      ) : null}
      <Link
        href={`/cases/${caseId}`}
        className="inline-block text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4"
      >
        {t('backToCase')}
      </Link>
    </div>
  );
}
