import type { UnfreezeTrack } from '@/lib/case/unfreeze-path';
import { getHindiLetterCompanion, HINDI_COMPANION_LABEL } from '@/lib/letters/hindi-companion';

/**
 * A reviewed Hindi companion shown BELOW the English letter. The English letter
 * stays the document the user sends; this only helps a Hindi-only reader
 * understand what they are sending. Always Hindi, on both /en and /hi, and
 * visually secondary to the English letter above it.
 */
export function HindiLetterCompanion({ track }: { track: UnfreezeTrack }) {
  const companion = getHindiLetterCompanion(track);

  return (
    <div
      lang="hi"
      className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-3"
    >
      <p className="text-[0.6875rem] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
        {HINDI_COMPANION_LABEL}
      </p>
      <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--ink-muted)]">
        {companion.intro}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-[0.8125rem] leading-relaxed text-[var(--ink-muted)]">
        {companion.asks.map((ask, i) => (
          <li key={i}>{ask}</li>
        ))}
      </ul>
    </div>
  );
}
