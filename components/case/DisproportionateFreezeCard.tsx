// Rule-based card: shown only when the whole account is blocked (total or
// debit freeze). Every legal claim shown here comes from lib/legal/positions.ts
// (sourced + currency-tagged from docs/RESEARCH_FREEZE_DOMAIN.md) via
// LegalPositionNote — do NOT assert legal claims inline without a source.

import { useTranslations } from 'next-intl';
import { LegalPositionNote } from '@/components/legal/LegalPositionNote';
import { DISPUTED_AMOUNT_RULE, BLANKET_FREEZE_RULINGS } from '@/lib/legal/positions';

type Props = {
  freezeType: string | null;
  frozenAmountInr: string | null;
};

export function DisproportionateFreezeCard({ freezeType, frozenAmountInr }: Props) {
  const t = useTranslations('DisproportionateFreezeCard');
  if (freezeType !== 'total_freeze' && freezeType !== 'debit_freeze') return null;

  const holdClause = frozenAmountInr
    ? t('holdClauseWithAmount', { amount: frozenAmountInr })
    : t('holdClauseNoAmount');

  return (
    <div className="u-card border-[var(--warn)]/30 bg-[var(--warn-muted)] p-5">
      <p className="text-sm font-semibold text-[var(--ink)]">{t('title')}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">
        {freezeType === 'total_freeze' ? t('totalFreezeIntro') : t('debitFreezeIntro')}{' '}
        {t('positionLead')}
      </p>

      <div className="mt-3 space-y-2">
        <LegalPositionNote position={DISPUTED_AMOUNT_RULE} />
        <LegalPositionNote position={BLANKET_FREEZE_RULINGS} />
      </div>

      <p className="mt-3 text-sm font-medium text-[var(--ink)]">{t('demandLabel')}</p>
      <blockquote className="mt-2 rounded-lg border border-[var(--warn)]/30 bg-[var(--surface-raised)] p-4 text-sm leading-relaxed text-[var(--ink)]">
        {t('quote', { holdClause })}
      </blockquote>
      <p className="mt-3 text-sm">
        <a
          href="/guides/sop-2026"
          className="font-semibold text-[var(--color-sky-deep)] underline underline-offset-2"
        >
          {t('knowYourRights')}
        </a>
      </p>
    </div>
  );
}
