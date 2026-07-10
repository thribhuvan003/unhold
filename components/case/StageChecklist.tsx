import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { StageRowModel } from '@/components/case/case-stages';

type StageChecklistProps = {
  caseId: string;
  stages: StageRowModel[];
};

/** The 5-stage checklist: done ✓ / current / locked rows with one Open action. */
export function StageChecklist({ caseId, stages }: StageChecklistProps) {
  const t = useTranslations('StageChecklist');
  return (
    <section data-testid="stage-checklist" className="flex flex-col gap-2">
      {stages.map((stage, i) => {
        const href =
          stage.target === 'papers'
            ? `/cases/${caseId}/papers`
            : stage.target === 'letter'
              ? `/cases/${caseId}/letters/L1`
              : stage.target === 'path'
                ? '#unfreeze-path'
                : stage.target === 'authority'
                  ? '#authority-actions'
                  : null;
        const openClass =
          'flex min-h-[36px] flex-none items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-[0.78125rem] font-semibold text-[var(--color-sky-deep)] no-underline';
        return (
          <div
            key={stage.title}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3.5 py-3',
              stage.state === 'current'
                ? 'border-[var(--color-sky-deep)] bg-[var(--color-sky-muted)]'
                : stage.state === 'locked'
                  ? 'border-dashed border-[var(--border)] bg-[var(--surface-raised)] opacity-60'
                  : 'border-[var(--border)] bg-[var(--surface-raised)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-[0.8125rem] font-bold',
                stage.state === 'done'
                  ? 'border border-[var(--success)]/30 bg-[var(--success-muted)] text-[var(--success)]'
                  : stage.state === 'current'
                    ? 'bg-[var(--color-sky-deep)] text-white'
                    : 'bg-[var(--surface)] text-[var(--ink-faint)]',
              )}
            >
              {stage.state === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'text-[0.90625rem] font-semibold',
                  stage.state === 'locked' ? 'text-[var(--ink-faint)]' : 'text-[var(--ink)]',
                )}
              >
                {stage.title}
                {stage.state === 'locked' ? <span className="sr-only"> {t('locked')}</span> : null}
              </p>
              <p className="text-xs text-[var(--ink-faint)]">{stage.note}</p>
            </div>
            {href ? (
              href.startsWith('#') ? (
                <a href={href} className={openClass}>
                  {t('open')}
                  <span className="sr-only"> — {stage.title}</span>
                </a>
              ) : (
                <Link href={href} className={openClass}>
                  {t('open')}
                  <span className="sr-only"> — {stage.title}</span>
                </Link>
              )
            ) : null}
          </div>
        );
      })}
    </section>
  );
}
