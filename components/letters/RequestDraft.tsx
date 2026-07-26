'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { DraftPendingRefresh } from '@/components/letters/DraftPendingRefresh';
import { track } from '@/lib/analytics/events';

type RequestDraftProps = {
  caseId: string;
  level: 'L1' | 'L2' | 'L3';
};

/**
 * Opened before the letter exists (e.g. straight from "Open my letter" on the
 * case page): asks the drafter for this level once, then hands over to the
 * auto-refreshing pending state. Without this, the link was a 404 dead end.
 */
export function RequestDraft({ caseId, level }: RequestDraftProps) {
  const t = useTranslations('RequestDraft');
  const [phase, setPhase] = useState<'requesting' | 'pending' | 'error'>('requesting');
  const [error, setError] = useState<string | null>(null);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void (async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const res = await fetch(`/api/v1/cases/${caseId}/escalations`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ level }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message ?? t('errorFallback'));
        }
        setPhase('pending');
        track('letter_generated', { level });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('errorFallback'));
        setPhase('error');
      }
    })();
  }, [caseId, level, t]);

  if (phase === 'pending') {
    return <DraftPendingRefresh caseId={caseId} level={level} />;
  }

  if (phase === 'error') {
    return (
      <div className="u-card space-y-4 p-5">
        <h1 className="type-display text-xl">{t('notReadyTitle')}</h1>
        <p role="alert" className="u-alert u-alert-warn">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="u-btn u-btn-primary min-h-[44px]"
          >
            {t('tryAgain')}
          </button>
          <Link href={`/cases/${caseId}`} className="u-btn u-btn-ghost min-h-[44px]">
            {t('backToCase')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="u-card space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-sky-deep)]" aria-hidden="true" />
        <h1 className="type-display text-xl">{t('startingTitle')}</h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t('startingBody')}</p>
    </div>
  );
}
