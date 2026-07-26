'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';

const FAST_POLL_MS = 2_500;
const SLOW_POLL_MS = 6_000;
const SLOW_AFTER_MS = 30_000;
const GIVE_UP_MS = 120_000;

/**
 * Shown while the draft is still being prepared. Auto-refreshes the
 * server-rendered page so the user is never stuck on a manual-refresh dead end.
 */
export function DraftPendingRefresh({ caseId, level }: { caseId: string; level: string }) {
  const t = useTranslations('DraftPendingRefresh');
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const [stuck, setStuck] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    startedAt.current ??= Date.now();

    const tick = () => {
      if (cancelled || startedAt.current === null) return;
      const elapsed = Date.now() - startedAt.current;
      if (elapsed > GIVE_UP_MS) {
        setStuck(true);
        return;
      }
      if (elapsed > SLOW_AFTER_MS) setSlow(true);
      router.refresh();
      timer = setTimeout(tick, elapsed < SLOW_AFTER_MS ? FAST_POLL_MS : SLOW_POLL_MS);
    };

    timer = setTimeout(tick, FAST_POLL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return (
    <div
      className="u-card space-y-4 p-5 sm:p-6"
      role="status"
      aria-live="polite"
      aria-busy={!stuck}
    >
      <div className="flex items-center gap-3">
        {!stuck ? (
          <Loader2 className="h-5 w-5 animate-spin text-[var(--color-sky-deep)]" aria-hidden />
        ) : null}
        <h1 className="type-display text-xl">
          {stuck ? t('stuckTitle', { level }) : t('writingTitle', { level })}
        </h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        {stuck ? t('stuckBody') : t('writingBody')}
      </p>
      {slow && !stuck ? (
        <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-muted)] px-4 py-3 text-sm text-[var(--ink)]">
          {t('slowNote')}
        </div>
      ) : null}
      {stuck ? (
        <button
          type="button"
          className="u-btn u-btn-secondary min-h-[44px] w-full text-sm font-semibold"
          onClick={() => {
            setStuck(false);
            setSlow(false);
            startedAt.current = Date.now();
            router.refresh();
          }}
        >
          {t('tryAgain')}
        </button>
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
