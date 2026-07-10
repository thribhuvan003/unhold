type ProvenanceChipProps = {
  /** ISO date this fact was last verified against an official source. */
  verifiedDate: string;
  /** Link to the official source (optional — chip degrades to date-only). */
  sourceUrl?: string;
  /** Label for the source link. */
  sourceLabel?: string;
};

/**
 * "✓ Verified · {date} · official source ↗" — the visible proof that an email,
 * phone, or portal came from a dated official page, not a guess. This is the
 * concrete thing a general chatbot cannot show: where the fact came from and
 * when it was checked.
 */
export function ProvenanceChip({ verifiedDate, sourceUrl, sourceLabel }: ProvenanceChipProps) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 rounded-full bg-[var(--success-muted)] px-2 py-0.5 text-[0.65625rem] font-bold text-[var(--success)]">
      <span>✓ Verified {verifiedDate}</span>
      {sourceUrl ? (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {sourceLabel ?? 'official source'} ↗
        </a>
      ) : null}
    </span>
  );
}
