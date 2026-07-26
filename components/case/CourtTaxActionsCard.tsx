'use client';

import { useTranslations } from 'next-intl';
import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

type CourtTaxActionsCardProps = {
  track: Exclude<UnfreezeTrack, 'cyber' | 'branch'>;
  l1Sent: boolean;
};

/**
 * Court / tax freezes: branch cannot release. Keep users off the bank-ladder cosplay.
 */
export function CourtTaxActionsCard({ track, l1Sent }: CourtTaxActionsCardProps) {
  const t = useTranslations('CourtTaxActionsCard');
  const isCourt = track === 'court';

  return (
    <section id="authority-actions" data-testid="court-tax-actions" className="u-card scroll-mt-20 p-4">
      <p className="type-eyebrow">{t('eyebrow')}</p>
      <h2 className="type-display mt-1.5 text-lg text-[var(--ink)]">
        {isCourt ? t('courtTitle') : t('taxTitle')}
      </h2>
      <p className="mt-2 text-[0.84375rem] leading-relaxed text-[var(--ink-muted)]">
        {isCourt ? t('courtBody') : t('taxBody')}
      </p>
      <ol className="mt-3 flex list-decimal flex-col gap-2 pl-5 text-[0.84375rem] leading-relaxed text-[var(--ink)]">
        <li>{l1Sent ? t('step1Done') : t('step1')}</li>
        <li>{isCourt ? t('courtStep2') : t('taxStep2')}</li>
        <li>{t('step3')}</li>
      </ol>
      <p className="mt-3 text-xs leading-relaxed text-[var(--ink-faint)]">{t('disclaimer')}</p>
    </section>
  );
}
