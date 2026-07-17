'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { computeSha256HexInBrowser } from '@/lib/evidence/sha256';
import { validateUploadFile } from '@/lib/evidence/validate-file';
import { track } from '@/lib/analytics/events';

type MarkSentFormProps = {
  caseId: string;
  escalationId: string;
  level: string;
  proofGateBlocked?: boolean;
  blockedReason?: string;
  onSuccess?: () => void;
};

type SubmitPhase = 'idle' | 'uploading' | 'saving';

const LEVEL_NUM: Record<string, number> = { L1: 1, L2: 2, L3: 3 };

/**
 * Proof + mark-sent card. The proof photo is a hard gate (same rule as
 * lib/escalations/proof-gates.ts): no proof, no mark-sent, and the next
 * letter stays locked.
 */
export function MarkSentForm({
  caseId,
  escalationId,
  level,
  proofGateBlocked = false,
  blockedReason,
  onSuccess,
}: MarkSentFormProps) {
  const t = useTranslations('MarkSentForm');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<SubmitPhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [liteSaving, setLiteSaving] = useState(false);
  const [liteDone, setLiteDone] = useState(false);

  /** Lightweight "I sent it" — no proof photo; the next letter stays locked
   *  until proof is added through the full flow. */
  async function handleLiteSent() {
    if (liteSaving || submitting || success) return;
    setError(null);
    setLiteSaving(true);
    try {
      const res = await fetch(
        `/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent-lite`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      );
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload?.error?.message ?? t('markSentError'));
        return;
      }
      track('letter_marked_sent', { level, proof: false });
      setLiteDone(true);
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError(t('networkError'));
    } finally {
      setLiteSaving(false);
    }
  }

  const submitting = phase !== 'idle';
  const n = LEVEL_NUM[level] ?? 1;
  const next = n + 1;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (proofGateBlocked) {
      setError(blockedReason ?? t('blockedSubmit'));
      return;
    }

    if (!proofFile) {
      setError(t('addProofFirst', { next }));
      return;
    }

    const jsonHeaders: Record<string, string> = { 'Content-Type': 'application/json' };

    setPhase('uploading');
    try {
      const urlRes = await fetch(`/api/v1/cases/${caseId}/evidence/upload-url`, {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          evidence_type: 'letter_sent_proof',
          filename: proofFile.name,
          mime_type: proofFile.type,
          file_size_bytes: proofFile.size,
        }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) {
        throw new Error(urlJson.error?.message ?? t('uploadStartError'));
      }

      const putRes = await fetch(urlJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': proofFile.type },
        body: proofFile,
      });
      if (!putRes.ok) {
        throw new Error(t('uploadFailed'));
      }

      const sha256 = await computeSha256HexInBrowser(proofFile);
      const confirmRes = await fetch(
        `/api/v1/cases/${caseId}/evidence/${urlJson.evidence_id}/confirm`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ sha256 }),
        },
      );
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmJson.error?.message ?? t('confirmError'));
      }

      setPhase('saving');
      const response = await fetch(
        `/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
        {
          method: 'POST',
          headers: {
            ...jsonHeaders,
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({ proof_evidence_id: urlJson.evidence_id }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        // Show the plain message only — never the raw guard code (e.g.
        // "has_prior_level_proof") to a stressed user.
        setError(payload?.error?.message ?? t('markSentError'));
        return;
      }

      setSuccess(true);
      track('letter_marked_sent', { level });
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('networkError'));
    } finally {
      setPhase('idle');
    }
  }

  return (
    <form onSubmit={handleSubmit} data-testid="mark-sent-form" className="u-card animate-fade-up p-4">
      <p className="text-[0.90625rem] font-semibold text-[var(--ink)]">{t('title')}</p>
      <p className="mt-1 text-[0.78125rem] leading-normal text-[var(--ink-muted)]">
        {t('subtitle', { next })}
      </p>

      {proofGateBlocked ? (
        <div role="alert" className="u-alert u-alert-warn mt-3">
          {blockedReason ?? t('blockedDefault')}
        </div>
      ) : null}

      {proofFile ? (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--success-muted)] px-3 py-1.5 text-[0.78125rem] font-semibold text-[var(--success)]">
          {t('proofAdded', { name: proofFile.name })}
        </p>
      ) : (
        <label
          className={cn(
            'mt-3 flex min-h-[64px] w-full cursor-pointer items-center justify-center rounded-[var(--radius-md)] border-2 border-dashed border-[var(--border-strong)] bg-[var(--paper)] px-4 text-[0.84375rem] font-semibold text-[var(--ink-muted)]',
            (proofGateBlocked || submitting || success) && 'cursor-not-allowed opacity-55',
          )}
        >
          {t('addProofLabel')}
          <input
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            disabled={proofGateBlocked || submitting || success}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const fileProblem = validateUploadFile(file);
                if (fileProblem) {
                  setError(fileProblem);
                } else {
                  setProofFile(file);
                  setError(null);
                }
              }
              e.target.value = '';
            }}
          />
        </label>
      )}

      <button
        type="submit"
        disabled={proofGateBlocked || submitting || success}
        className="u-btn u-btn-secondary mt-3 flex min-h-[48px] w-full text-[0.9375rem] font-semibold disabled:opacity-50"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {phase === 'uploading' ? t('uploading') : t('saving')}
          </>
        ) : (
          <>{t('submit', { n })}</>
        )}
      </button>

      <button
        type="button"
        onClick={handleLiteSent}
        disabled={proofGateBlocked || submitting || liteSaving || success}
        className="u-btn u-btn-ghost mt-2 flex min-h-[44px] w-full text-[0.84375rem] font-medium disabled:opacity-50"
      >
        {liteSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('saving')}
          </>
        ) : (
          <>{t('liteSubmit')}</>
        )}
      </button>

      {error ? (
        <p role="alert" className="u-alert u-alert-error mt-2.5">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="u-alert u-alert-success mt-2.5">
          {liteDone ? t('liteSuccess', { next }) : t('successNote')}
        </p>
      ) : null}
    </form>
  );
}
