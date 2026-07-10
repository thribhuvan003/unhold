'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Check, Loader2 } from 'lucide-react';
import { PLACEHOLDER_FIELDS, localizePlaceholderField, placeholderExplanation } from '@/components/letters/placeholder-labels';
import { HindiLetterCompanion } from '@/components/letters/HindiLetterCompanion';
import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';
import { Button } from '@/components/ui/Button';

type LetterPreviewProps = {
  caseId?: string;
  escalationId?: string;
  subject: string;
  body: string;
  level: string;
  placeholdersMissing: string[];
  approved?: boolean;
  evidenceReady?: boolean;
  /** Freeze track — when set, a reviewed Hindi companion is shown below the
   *  English letter (on both /en and /hi). */
  track?: UnfreezeTrack;
  /** Lifts the review state so the send card can unlock. */
  onApproved?: () => void;
  /** Same proof gate the approve API enforces, checked up front so the user
   * sees why (and what to do) before clicking "I reviewed this draft" fails. */
  gateBlocked?: boolean;
  gateBlockedReason?: string;
  gateBlockedHref?: string;
  gateBlockedLinkLabel?: string;
};

/**
 * The letter card: DRAFT ONLY banner (block C verbatim), check-strip, the
 * letter body, and the "I reviewed this draft" gate that unlocks sending.
 */
export function LetterPreview({
  subject,
  body,
  placeholdersMissing,
  approved = false,
  caseId,
  escalationId,
  evidenceReady,
  track,
  onApproved,
  gateBlocked = false,
  gateBlockedReason,
  gateBlockedHref,
  gateBlockedLinkLabel,
}: LetterPreviewProps) {
  const t = useTranslations('LetterPreview');
  const locale = useLocale();
  const [isApproved, setIsApproved] = useState(approved);
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  async function handleApprove() {
    if (!caseId || !escalationId || approving) return;
    setApproving(true);
    setApproveError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/escalations/${escalationId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent_acknowledged: true }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? t('approveError'));
      }
      setIsApproved(true);
      onApproved?.();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : t('approveError'));
    } finally {
      setApproving(false);
    }
  }

  if (!evidenceReady) {
    return (
      <article className="u-card border-[var(--warn)]/30 bg-[var(--warn-muted)] p-4 text-sm text-[var(--ink)]">
        <p className="font-semibold">{t('papersFirstTitle')}</p>
        <p className="mt-1 text-[var(--ink-muted)]">{t('papersFirstBody')}</p>
        <a href={`/cases/${caseId}/papers`} className="mt-2 inline-block font-medium underline">
          {t('addPapers')}
        </a>
      </article>
    );
  }

  return (
    <article data-testid="letter-preview" className="u-card animate-fade-up p-4">
      <div className="mb-3.5 flex items-center justify-between gap-2">
        <span className="type-mono-data rounded-md border border-[var(--error)]/30 bg-[var(--error-muted)] px-2.5 py-1 text-[0.6875rem] font-bold tracking-wide text-[var(--error)]">
          {t('draftOnly')}
        </span>
      </div>

      <div className="u-letter-disclaimer">{t('checkBeforeSend')}</div>

      {placeholdersMissing.length > 0 ? (
        <div className="mb-3.5 rounded-[var(--radius-md)] border border-[var(--warn)]/30 bg-[var(--warn-muted)] px-3.5 py-3 text-sm text-[var(--ink)]">
          <p className="font-semibold">{t('stillNeeded')}</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-[var(--ink-muted)]">
            {placeholdersMissing.map((p) => (
              <li key={p}>{(PLACEHOLDER_FIELDS[p] && localizePlaceholderField(PLACEHOLDER_FIELDS[p], locale).label) ?? placeholderExplanation(p, locale) ?? p}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-[var(--ink-muted)]">{t('completeHint')}</p>
        </div>
      ) : null}

      <p className="type-mono-data text-xs text-ink-faint">{t('subject', { subject })}</p>
      <pre className="u-letter-body mt-3 overflow-x-auto text-[0.8125rem]">{body}</pre>

      {track ? <HindiLetterCompanion track={track} /> : null}

      <div className="mt-4 border-t border-[var(--surface)] pt-3.5">
        {isApproved ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-[var(--success-muted)] px-3 py-1 text-xs font-semibold text-[var(--success)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t('reviewedByYou')}
          </span>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{t('readAndCheck')}</p>
            {gateBlocked ? (
              <div role="alert" className="u-alert u-alert-warn mt-3">
                <p>{gateBlockedReason ?? t('gateBlockedFallback')}</p>
                {gateBlockedHref ? (
                  <Link href={gateBlockedHref} className="mt-1 inline-block font-medium underline">
                    {gateBlockedLinkLabel ?? t('fixThis')}
                  </Link>
                ) : null}
              </div>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              disabled={
                approving || gateBlocked || placeholdersMissing.length > 0 || !caseId || !escalationId
              }
              onClick={handleApprove}
              className="mt-2.5 w-full gap-2"
            >
              {approving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {t('iReviewed')}
            </Button>
            {placeholdersMissing.length > 0 ? (
              <p className="mt-2 text-xs text-[var(--ink-faint)]">{t('fillMissing')}</p>
            ) : null}
          </>
        )}
        {approveError ? (
          <p role="alert" className="u-alert u-alert-warn mt-3">
            {approveError}
          </p>
        ) : null}
      </div>
    </article>
  );
}
