'use client';

import { useState } from 'react';
import { Loader2, Package, Download } from 'lucide-react';

interface BundleButtonProps {
  caseId: string;
  guestToken?: string;
}

type Phase = 'idle' | 'creating' | 'done' | 'error';
type BundleResult = { download_url: string; evidence_count: number; manifest_sha256: string; expires_at: string };

export function BundleButton({ caseId, guestToken }: BundleButtonProps) {
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
        headers: guestToken ? { 'X-Guest-Token': guestToken } : {},
      });
      const json = await res.json();
      if (res.status === 403) {
        throw new Error(
          "Sealing a package needs an account. You can upload and check documents as a guest — sign in to download the sealed bundle.",
        );
      }
      if (res.status === 422) {
        throw new Error('Add and verify at least one document above before sealing your package.');
      }
      if (!res.ok) {
        throw new Error(json.error?.message ?? 'Could not create your package');
      }
      setResult(json as BundleResult);
      setPhase('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setPhase('error');
    }
  }

  return (
    <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
      <div>
        <p className="text-sm font-medium text-[var(--ink)]">Sealed package for your bank</p>
        <p className="type-caption text-ink-faint">
          Bundle your verified documents into one SHA-256 sealed PDF with a cover page and manifest — ready to
          attach to your letter.
        </p>
      </div>

      <button
        type="button"
        onClick={createBundle}
        disabled={phase === 'creating'}
        className="u-btn u-btn-secondary inline-flex min-h-[44px] items-center gap-2 px-4 text-sm disabled:opacity-50"
      >
        {phase === 'creating' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Package className="h-4 w-4" aria-hidden />}
        {phase === 'creating' ? 'Sealing…' : 'Create sealed package'}
      </button>

      {phase === 'error' ? (
        <p role="alert" className="u-alert u-alert-warn">
          {error}
        </p>
      ) : null}

      {phase === 'done' && result ? (
        <div className="u-card animate-scale-in space-y-2 p-4">
          <a
            href={result.download_url}
            className="u-btn u-btn-primary inline-flex min-h-[44px] items-center gap-2 px-4 text-sm"
          >
            <Download className="h-4 w-4" aria-hidden />
            Download sealed package
          </a>
          <p className="type-caption text-ink-faint">
            {result.evidence_count} document{result.evidence_count === 1 ? '' : 's'} sealed · SHA-256{' '}
            <span className="type-mono-data">{result.manifest_sha256.slice(0, 12)}…</span> · link expires in 1 hour.
          </p>
        </div>
      ) : null}
    </div>
  );
}
