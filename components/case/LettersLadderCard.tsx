import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Check } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import type { LetterSummary } from '@/components/case/LettersPanel';

type LettersLadderCardProps = {
  caseId: string;
  letters: LetterSummary[];
  letterUnlocked: boolean;
  l1Sent: boolean;
};

/** Compact letters ladder: L1 branch manager → L2 nodal officer → L3 RBI Ombudsman. */
export function LettersLadderCard({ caseId, letters, letterUnlocked, l1Sent }: LettersLadderCardProps) {
  const t = useTranslations('LettersLadderCard');
  const byLevel = new Map(letters.map((l) => [l.level, l]));
  const l2Open = byLevel.get('L2')?.hasDraft ?? false;
  const l3Open = byLevel.get('L3')?.hasDraft ?? false;

  const rows: Array<{
    level: 'L1' | 'L2' | 'L3';
    name: string;
    note: string;
    chip: string | null;
    chipTone: 'success' | 'neutral' | null;
    open: boolean;
    locked: boolean;
  }> = [
    {
      level: 'L1',
      name: t('l1Name'),
      note: t('l1Note'),
      chip: l1Sent ? t('sent') : null,
      chipTone: l1Sent ? 'success' : null,
      open: !l1Sent && letterUnlocked,
      locked: false,
    },
    {
      level: 'L2',
      name: t('l2Name'),
      note: l1Sent ? t('l2NoteOpen') : t('l2NoteLocked'),
      chip: l2Open ? null : t('locked'),
      chipTone: l2Open ? null : 'neutral',
      open: l2Open,
      locked: !l2Open,
    },
    {
      level: 'L3',
      name: t('l3Name'),
      note: t('l3Note'),
      chip: l3Open ? null : t('locked'),
      chipTone: l3Open ? null : 'neutral',
      open: l3Open,
      locked: !l3Open,
    },
  ];

  return (
    <section data-testid="letters-ladder" className="u-card p-4">
      <p className="type-eyebrow">{t('eyebrow')}</p>
      <div className="mt-2.5 flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row.level}
            className={cn(
              'flex items-center gap-2.5 rounded-[var(--radius-md)] border bg-[var(--surface-raised)] px-3 py-2.5',
              row.locked ? 'border-dashed border-[var(--border)] opacity-65' : 'border-[var(--border)]',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">{row.name}</p>
              <p className="mt-px text-xs text-[var(--ink-faint)]">{row.note}</p>
            </div>
            {row.chip ? (
              <span
                className={cn(
                  'inline-flex flex-none items-center gap-1 rounded-full px-2.5 py-1 text-[0.71875rem] font-semibold',
                  row.chipTone === 'success'
                    ? 'bg-[var(--success-muted)] text-[var(--success)]'
                    : 'bg-[var(--surface)] text-[var(--ink-faint)]',
                )}
              >
                {row.chipTone === 'success' ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                {row.chip}
              </span>
            ) : null}
            {row.open ? (
              <Link
                href={`/cases/${caseId}/letters/${row.level}`}
                className="flex min-h-[36px] flex-none items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-[0.78125rem] font-semibold text-[var(--color-sky-deep)] no-underline"
              >
                {t('open')}
                <span className="sr-only"> — {row.name}</span>
              </Link>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
