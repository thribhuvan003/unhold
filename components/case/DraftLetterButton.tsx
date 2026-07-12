'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, FilePlus2 } from 'lucide-react';

interface DraftLetterButtonProps {
  caseId: string;
  level: 'L1' | 'L2' | 'L3';
}

type Phase = 'idle' | 'requesting' | 'requested' | 'error';

export function DraftLetterButton({ caseId, level }: DraftLetterButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);

  async function requestDraft() {
    if (phase === 'requesting') return;
    setPhase('requesting');
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/escalations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ level }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? json.error ?? 'Could not start your letter');
      }
      setPhase('requested');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  if (phase === 'requested') {
    return (
      <p className="type-caption text-ink-faint">
        Letter request received. Your {level} draft is being prepared for review and copy-only use.
      </p>
    );
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={requestDraft}
        disabled={phase === 'requesting'}
        className="u-btn u-btn-secondary inline-flex min-h-[44px] items-center gap-1.5 px-3 text-sm disabled:opacity-50"
      >
        {phase === 'requesting' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <FilePlus2 className="h-4 w-4" aria-hidden />}
        {phase === 'requesting' ? 'Starting…' : `Generate ${level} letter`}
      </button>
      {phase === 'error' ? (
        <p role="alert" className="mt-1 text-xs text-[var(--error)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
