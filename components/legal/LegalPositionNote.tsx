import { useLocale, useTranslations } from 'next-intl';
import type { LegalPosition } from '@/lib/legal/positions';
import { cn } from '@/lib/ui/cn';

type LegalPositionNoteProps = {
  position: LegalPosition;
  className?: string;
};

/**
 * Shows a legal position with its source and an honest currency badge. A
 * 'contested' position is styled as a warning and labelled "under Supreme Court
 * appeal" so we never present unsettled law as settled — the failure a general
 * chatbot makes because its training cutoff predates the appeal.
 */
export function LegalPositionNote({ position, className }: LegalPositionNoteProps) {
  const t = useTranslations('LegalPositionNote');
  const locale = useLocale();
  const contested = position.currency === 'contested';
  const caution = position.currency === 'caution';
  // Under /hi show the reviewed Hindi explanation as the primary text, with the
  // English claim kept visible below it — English is the citable ammunition.
  const claimHi = locale === 'hi' ? position.claimHi : undefined;
  const noteHi = locale === 'hi' ? position.noteHi : undefined;

  return (
    <div
      className={cn(
        'rounded-[var(--radius-md)] border px-3 py-2.5 text-sm leading-relaxed',
        contested || caution
          ? 'border-[var(--warn)]/30 bg-[var(--warn-muted)] text-[var(--ink)]'
          : 'border-[var(--success)]/25 bg-[var(--success-muted)] text-[var(--ink)]',
        className,
      )}
    >
      {claimHi ? (
        <>
          <p lang="hi">{claimHi}</p>
          <p lang="en" className="mt-1 text-[0.75rem] leading-normal text-[var(--ink-muted)]">
            “{position.claim}”
          </p>
        </>
      ) : (
        <p>{position.claim}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem]">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-bold uppercase tracking-wide',
            contested || caution
              ? 'bg-[var(--warn)]/20 text-[var(--warn-strong,var(--ink))]'
              : 'bg-[var(--success)]/20 text-[var(--success)]',
          )}
        >
          {contested ? t('contested') : caution ? t('caution') : t('current')}
        </span>
        <a
          href={position.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[var(--color-sky-deep)] underline underline-offset-2"
        >
          {position.source} ↗
        </a>
      </div>

      {noteHi ? (
        <p lang="hi" className="mt-1.5 text-[0.75rem] leading-normal text-[var(--ink-muted)]">
          {noteHi}
        </p>
      ) : position.note ? (
        <p className="mt-1.5 text-[0.75rem] leading-normal text-[var(--ink-muted)]">{position.note}</p>
      ) : null}
    </div>
  );
}
