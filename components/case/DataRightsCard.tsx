'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Download, Loader2, Trash2 } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

type ActionState = 'idle' | 'working' | 'ready' | 'queued' | 'complete';

type DataRightsCardProps = {
  caseId: string;
  publicId: string;
};

function filenameFrom(response: Response): string {
  const disposition = response.headers.get('content-disposition') ?? '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return encoded ? decodeURIComponent(encoded) : plain ?? 'unhold-case-data.zip';
}

async function responseMessage(response: Response, fallback: string): Promise<string> {
  const body = await response.json().catch(() => null);
  return body?.error?.message ?? body?.message ?? fallback;
}

/**
 * A compact self-service privacy card. It deliberately does not promise that a
 * destructive request erases every record instantly: access blocks first, then
 * the server completes deletion after its required safety checks.
 */
export function DataRightsCard({ caseId, publicId }: DataRightsCardProps) {
  const t = useTranslations('DataRightsCard');
  const router = useRouter();
  const [exportState, setExportState] = useState<ActionState>('idle');
  const [eraseState, setEraseState] = useState<ActionState>('idle');
  const [showErase, setShowErase] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function downloadData() {
    if (exportState === 'working') return;
    setExportState('working');
    setError(null);

    try {
      const response = await fetch(`/api/v1/cases/${caseId}/data-export`, { method: 'GET' });
      if (response.status === 202) {
        setExportState('queued');
        return;
      }
      if (!response.ok) {
        throw new Error(await responseMessage(response, t('exportError')));
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filenameFrom(response);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      setExportState('ready');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('exportError'));
      setExportState('idle');
    }
  }

  async function requestErasure() {
    if (eraseState === 'working' || confirmation.trim() !== publicId) return;
    setEraseState('working');
    setError(null);

    try {
      const response = await fetch(`/api/v1/cases/${caseId}/erasure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm_case_id: publicId }),
      });

      if (response.status === 202) {
        setEraseState('queued');
        router.replace('/case-deleted');
        return;
      }
      if (response.status === 200 || response.status === 204) {
        setEraseState('complete');
        router.replace('/case-deleted');
        return;
      }
      if (!response.ok) {
        throw new Error(await responseMessage(response, t('eraseError')));
      }
      setEraseState('complete');
      router.replace('/case-deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('eraseError'));
      setEraseState('idle');
    }
  }

  const confirmationMatches = confirmation.trim() === publicId;
  const erasureFinished = eraseState === 'queued' || eraseState === 'complete';

  return (
    <section data-testid="data-rights" className="u-card overflow-hidden p-0">
      <div className="border-b border-[var(--border)] bg-[var(--color-sky-mist)]/50 px-4 py-3.5">
        <p className="type-eyebrow text-[var(--color-sky-deep)]">{t('eyebrow')}</p>
        <h2 className="type-display mt-1 text-[1.0625rem]">{t('title')}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">{t('intro')}</p>
      </div>

      <div className="flex flex-col gap-3 p-4">
        <button
          type="button"
          onClick={downloadData}
          disabled={exportState === 'working'}
          className="u-btn u-btn-ghost flex min-h-[46px] w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          {exportState === 'working' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t('downloading')}
            </>
          ) : (
            <>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('download')}
            </>
          )}
        </button>

        {exportState === 'ready' ? (
          <p role="status" className="text-xs font-medium text-[var(--success)]">
            {t('downloadReady')}
          </p>
        ) : null}
        {exportState === 'queued' ? (
          <p role="status" className="text-xs leading-relaxed text-[var(--ink-muted)]">
            {t('downloadQueued')}
          </p>
        ) : null}

        <div className="border-t border-[var(--border)] pt-3">
          {!showErase && !erasureFinished ? (
            <button
              type="button"
              onClick={() => {
                setShowErase(true);
                setError(null);
              }}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--error)]/30 bg-[var(--error-muted)] px-3 text-sm font-semibold text-[var(--error)]"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              {t('showErase')}
            </button>
          ) : null}

          {showErase && !erasureFinished ? (
            <div className="rounded-[var(--radius-md)] border border-[var(--error)]/30 bg-[var(--error-muted)] p-3.5">
              <p className="flex items-center gap-2 text-[0.84375rem] font-semibold text-[var(--ink)]">
                <AlertTriangle className="h-4 w-4 text-[var(--error)]" aria-hidden="true" />
                {t('eraseTitle')}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">{t('eraseBody')}</p>
              <label className="mt-3 block">
                <span className="text-xs font-semibold text-[var(--ink)]">{t('confirmLabel', { publicId })}</span>
                <input
                  type="text"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder={t('confirmPlaceholder')}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="u-input mt-1.5 font-mono"
                  aria-describedby="data-rights-confirmation-hint"
                />
              </label>
              <p id="data-rights-confirmation-hint" className="mt-1.5 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">
                {t('eraseHint')}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowErase(false);
                    setConfirmation('');
                  }}
                  className="u-btn u-btn-ghost min-h-[44px] flex-1 px-3 text-sm font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={requestErasure}
                  disabled={!confirmationMatches || eraseState === 'working'}
                  className="u-btn min-h-[44px] flex-1 bg-[var(--error)] px-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {eraseState === 'working' ? t('erasing') : t('erase')}
                </button>
              </div>
            </div>
          ) : null}

          {eraseState === 'queued' ? (
            <p role="status" className="text-xs leading-relaxed text-[var(--ink-muted)]">
              {t('eraseQueued')}
            </p>
          ) : null}
          {eraseState === 'complete' ? (
            <p role="status" className="flex items-start gap-2 text-xs leading-relaxed text-[var(--success)]">
              <Check className="mt-px h-4 w-4 flex-none" aria-hidden="true" />
              {t('eraseComplete')}
            </p>
          ) : null}
        </div>

        {error ? (
          <p role="alert" className="u-alert u-alert-error">
            {error}
          </p>
        ) : null}
      </div>
    </section>
  );
}
