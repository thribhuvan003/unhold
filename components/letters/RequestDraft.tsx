'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Loader2 } from 'lucide-react';
import { DraftPendingRefresh } from '@/components/letters/DraftPendingRefresh';

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
          throw new Error(
            json.error?.message ??
              'We could not start your letter right now. Your case is safe — please try again in a moment.',
          );
        }
        setPhase('pending');
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'We could not start your letter right now. Your case is safe — please try again in a moment.',
        );
        setPhase('error');
      }
    })();
  }, [caseId, level]);

  if (phase === 'pending') {
    return <DraftPendingRefresh caseId={caseId} level={level} />;
  }

  if (phase === 'error') {
    return (
      <div className="u-card space-y-4 p-5">
        <h1 className="type-display text-xl">Your letter is not ready yet</h1>
        <p role="alert" className="u-alert u-alert-warn">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="u-btn u-btn-primary min-h-[44px]"
          >
            Try again
          </button>
          <Link href={`/cases/${caseId}`} className="u-btn u-btn-ghost min-h-[44px]">
            ← Back to my case
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="u-card space-y-4 p-5">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-sky-deep)]" aria-hidden="true" />
        <h1 className="type-display text-xl">Starting your letter…</h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        We are asking the drafter to write your formal, bank-ready letter from your answers. This
        usually takes under a minute.
      </p>
    </div>
  );
}
