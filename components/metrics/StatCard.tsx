/**
 * Presentational stat tile for the public /impact page. Server component — no
 * client JS. `muted` styles a placeholder value (e.g. a "coming soon" metric).
 */
export function StatCard({
  label,
  value,
  sub,
  muted = false,
}: {
  label: string;
  value: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div className="u-card p-4">
      <p className="type-caption text-[var(--ink-faint)]">{label}</p>
      <p
        className={`type-display mt-1 text-[1.6rem] ${
          muted ? 'text-[var(--ink-faint)]' : 'text-[var(--ink)]'
        }`}
      >
        {value}
      </p>
      {sub ? <p className="type-caption mt-0.5 text-[var(--ink-faint)]">{sub}</p> : null}
    </div>
  );
}
