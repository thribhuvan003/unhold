import { Badge } from '@/components/ui/Badge';
import type { NoticeAnalysisResult, NoticeSeverity } from '@/components/intake/notice-analysis-types';

const SEVERITY_TONE: Record<NoticeSeverity, 'neutral' | 'warn' | 'error'> = {
  low: 'neutral',
  medium: 'warn',
  high: 'warn',
  critical: 'error',
};

const SEVERITY_LABEL: Record<NoticeSeverity, string> = {
  low: 'Low severity',
  medium: 'Medium severity',
  high: 'High severity',
  critical: 'Critical',
};

/** Presentational result card shared by the hero (guest/report) and the case workspace. */
export function NoticeAnalysisCard({ result }: { result: NoticeAnalysisResult }) {
  return (
    <article className="u-card animate-scale-in space-y-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={SEVERITY_TONE[result.severity]}>{SEVERITY_LABEL[result.severity]}</Badge>
        <Badge tone="neutral">{Math.round(result.confidence * 100)}% confidence</Badge>
        {result.human_review_required ? <Badge tone="warn">Worth a human check</Badge> : null}
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--paper)] p-3 text-sm text-[var(--ink-muted)]">
        Start with the official GRM/MRM path. Unhold helps you prepare evidence, a sealed bundle, and copy-only
        letters; you submit everything yourself.
      </div>

      <div className="space-y-1">
        <p className="type-eyebrow text-ink-faint">What this notice says</p>
        <p className="text-sm text-[var(--ink)]">{result.plain_english}</p>
      </div>

      <div className="space-y-1">
        <p className="type-eyebrow text-ink-faint">What this means for your money</p>
        <p className="text-sm text-[var(--ink)]">{result.what_this_means}</p>
      </div>

      {result.suggested_next.length > 0 ? (
        <div className="space-y-1">
          <p className="type-eyebrow text-ink-faint">Suggested next steps</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--ink)]">
            {result.suggested_next.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="type-caption text-ink-faint">
        This is guidance, not legal advice, and not a guarantee. You decide every step.
      </p>
    </article>
  );
}
