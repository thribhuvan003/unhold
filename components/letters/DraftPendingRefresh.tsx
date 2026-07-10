'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const POLL_MS = 6_000;
const SLOW_AFTER_MS = 45_000;

/**
 * Shown while the drafter is still writing the letter. Auto-refreshes the
 * server-rendered page so the user is never stuck on a manual-refresh dead end,
 * and explains what to do if it takes long.
 */
export function DraftPendingRefresh({ caseId, level }: { caseId: string; level: string }) {
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    startedAt.current ??= Date.now();
    const interval = setInterval(() => {
      if (startedAt.current !== null && Date.now() - startedAt.current > SLOW_AFTER_MS) setSlow(true);
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="u-card space-y-4 p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-sky-deep)]" aria-hidden />
        <h1 className="type-display text-xl">Writing your {level} letter…</h1>
      </div>
      <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
        We are preparing a formal, bank-ready letter from your answers. This page checks for it
        automatically — you don&apos;t need to refresh.
      </p>
      {slow ? (
        <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-muted)] px-4 py-3 text-sm text-[var(--ink)]">
          This is taking longer than usual. Your case is saved — you can leave this page and come
          back later, or continue collecting the documents on your checklist in the meantime.
        </div>
      ) : null}
      <a href={`/cases/${caseId}`} className="inline-block text-sm font-semibold text-[var(--color-sky-deep)] underline underline-offset-4">
        ← Back to your case
      </a>
    </div>
  );
}
