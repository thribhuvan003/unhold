'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

interface BundleButtonProps {
  caseId: string;
  /** Called after a successful seal so the letter send path can unlock without a full reload. */
  onSealed?: (result: BundleResult) => void;
  /** Compact chrome for the letter workspace. */
  compact?: boolean;
  className?: string;
}

type Phase = 'idle' | 'creating' | 'done' | 'error';
export type BundleResult = {
  download_url: string;
  evidence_count: number;
  manifest_sha256: string;
  expires_at: string;
};

/** "Your proof pack" card — seals checked papers into one PDF via the bundle API. */
export function BundleButton({
  caseId,
  onSealed,
  compact = false,
  className,
}: BundleButtonProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<BundleResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createBundle() {
    if (phase === 'creating') return;
    setPhase('creating');
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/evidence/bundle`, {
        method: 'POST',
      });
      const json = await res.json();
      if (res.status === 403) {
        throw new Error(
          'Please open this case from the same browser where you created it (or use your recovery code), then make your proof pack.',
        );
      }
      if (res.status === 422) {
        throw new Error('Add and check at least one paper on Papers before making your proof pack.');
      }
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Could not make your proof pack');
      }
      const sealed = json as BundleResult;
      setResult(sealed);
      setPhase('done');
      onSealed?.(sealed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  return (
    <section
      data-testid="proof-pack"
      className={cn('u-card p-4', className)}
    >
      <p className="text-[0.90625rem] font-semibold text-[var(--ink)]">Your proof pack (one sealed PDF)</p>
      <p className="mt-1 text-[0.78125rem] leading-normal text-[var(--ink-muted)]">
        {compact
          ? 'Seal your checked papers into one PDF with a tamper-evident checksum. Attach this file when you send the letter.'
          : "We combine your checked papers into one PDF with a cover page and a tamper-evident checksum (it shows the file hasn't changed since you sealed it). You attach it to your letter."}
      </p>

      {phase !== 'done' ? (
        <button
          type="button"
          onClick={createBundle}
          disabled={phase === 'creating'}
          className="u-btn u-btn-secondary mt-3 flex min-h-[46px] w-full text-sm font-semibold disabled:opacity-50"
        >
          {phase === 'creating' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sealing your papers…
            </>
          ) : (
            'Make my proof pack'
          )}
        </button>
      ) : null}

      {phase === 'error' ? (
        <p role="alert" className="u-alert u-alert-warn mt-3">
          {error}
        </p>
      ) : null}

      {phase === 'done' && result ? (
        <div className="animate-scale-in">
          <p className="mt-3 text-[0.84375rem] font-semibold text-[var(--success)]">
            ✓ Proof pack ready — {result.evidence_count} paper
            {result.evidence_count === 1 ? '' : 's'} sealed together
          </p>
          <p className="type-mono-data mt-1 text-[0.71875rem] text-ink-faint">
            seal code {result.manifest_sha256.slice(0, 12)}… · download link works for 1 hour
          </p>
          <a
            href={result.download_url}
            className="u-btn u-btn-primary mt-2.5 flex min-h-[46px] w-full text-sm font-semibold"
          >
            ↓ Download proof pack (PDF)
          </a>
        </div>
      ) : null}
    </section>
  );
}
