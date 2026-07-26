import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';

type PackageStatusCardProps = {
  track: UnfreezeTrack;
  hasFreezeNotice: boolean;
  hasBankStatement: boolean;
  hasSealedBundle: boolean;
  l1Drafted: boolean;
  l1Sent: boolean;
};

/**
 * Non-letter-wrapper progress: the real product is a package + path, not “L1–L3”.
 */
export function PackageStatusCard({
  track,
  hasFreezeNotice,
  hasBankStatement,
  hasSealedBundle,
  l1Drafted,
  l1Sent,
}: PackageStatusCardProps) {
  const t = useTranslations('PackageStatusCard');

  const rows: Array<{ done: boolean; label: string; note: string }> = [
    {
      done: hasFreezeNotice && hasBankStatement,
      label: t('papers'),
      note: t('papersNote'),
    },
    {
      done: hasSealedBundle,
      label: t('pack'),
      note: t('packNote'),
    },
    {
      done: l1Sent,
      label: track === 'cyber' ? t('branchDetails') : t('branchLetter'),
      note: l1Drafted && !l1Sent ? t('branchNoteDraft') : t('branchNote'),
    },
  ];

  if (track === 'cyber') {
    rows.push({
      done: false,
      label: t('authority'),
      note: l1Sent ? t('authorityNoteReady') : t('authorityNoteWait'),
    });
  } else if (track === 'court' || track === 'tax') {
    rows.push({
      done: false,
      label: track === 'court' ? t('court') : t('tax'),
      note: t('courtTaxNote'),
    });
  }

  const doneCount = rows.filter((r) => r.done).length;

  return (
    <section data-testid="package-status" className="u-card p-4">
      <p className="type-eyebrow">{t('eyebrow')}</p>
      <p className="mt-1 text-[0.90625rem] font-semibold text-[var(--ink)]">
        {t('title', { done: doneCount, total: rows.length })}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">{t('intro')}</p>
      <ul className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.label}
            className={cn(
              'flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5',
              row.done
                ? 'border-[var(--success)]/25 bg-[var(--success)]/6'
                : 'border-[var(--border)] bg-[var(--surface)]',
            )}
          >
            <span
              className={cn(
                'mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[0.6875rem] font-bold',
                row.done
                  ? 'bg-[var(--success-muted)] text-[var(--success)]'
                  : 'bg-[var(--surface-raised)] text-[var(--ink-faint)]',
              )}
              aria-hidden="true"
            >
              {row.done ? <Check className="h-3.5 w-3.5" /> : '·'}
            </span>
            <div className="min-w-0">
              <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">{row.label}</p>
              <p className="text-xs text-[var(--ink-faint)]">{row.note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
