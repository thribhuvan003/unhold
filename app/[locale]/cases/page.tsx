'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { ArrowUpRight, FolderOpen, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/ui/cn';

interface CaseSummary {
  id: string;
  public_id: string;
  status: string;
  user_action_required: boolean;
  evidence_count: number;
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Just started',
  intake_scoping: 'AI is reviewing your case',
  monitoring: 'Waiting on the bank',
  evidence_building: 'Gathering evidence',
  escalation: 'Escalation in progress',
  awaiting_response: 'Awaiting bank response',
  verified: 'Documents verified',
  resolved: 'Resolved',
  stalled: 'Stalled — needs a nudge',
  retried: 'Retrying',
  human_escalation: 'With a human reviewer',
  closed: 'Closed',
  public_pressure: 'Outcome shared anonymously',
};

const MIN_EVIDENCE_FOR_READY = 2;
const TARGET_EVIDENCE = 5;

function statusTone(status: string): 'forest' | 'success' | 'warn' | 'neutral' {
  if (status === 'resolved' || status === 'verified') return 'success';
  if (status === 'stalled' || status === 'human_escalation') return 'warn';
  if (status === 'closed') return 'neutral';
  return 'forest';
}

function evidenceReadiness(count: number): { label: string; percent: number; barClass: string } {
  const percent = Math.min(100, Math.round((count / TARGET_EVIDENCE) * 100));
  if (count >= TARGET_EVIDENCE) {
    return { label: `${count} documents — strong evidence base`, percent: 100, barClass: 'bg-[var(--success)]' };
  }
  if (count >= MIN_EVIDENCE_FOR_READY) {
    return { label: `${count}/${TARGET_EVIDENCE} docs — on track`, percent, barClass: 'bg-[var(--forest)]' };
  }
  return {
    label: `${count} document${count === 1 ? '' : 's'} uploaded — more evidence will help your case`,
    percent: Math.max(8, percent),
    barClass: 'bg-[var(--saffron)]',
  };
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/v1/cases');
        const json = await res.json();
        if (!res.ok) {
          setError(json.error?.message ?? 'We could not load your cases right now. Check your connection and refresh — nothing is lost.');
          return;
        }
        setCases(json.cases ?? []);
      } catch {
        setError('We could not load your cases right now. Check your connection and refresh — nothing is lost.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-eyebrow">Your pipeline</p>
          <h1 className="type-display mt-1 text-3xl">My cases</h1>
          <p className="type-lead mt-2 text-[0.9375rem]">
            Track progress, upload evidence, and take action when needed.
          </p>
        </div>
        <Link href="/start" className="u-btn u-btn-primary gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />
          New case
        </Link>
      </div>

      {error ? (
        // 401 = no guest session yet (first visit). Show CTA instead of scary error.
        error.toLowerCase().includes('auth') || error.toLowerCase().includes('unauthorized') ? (
          <Card className="animate-fade-up px-8 py-14 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-[var(--ink-faint)]" strokeWidth={1.25} aria-hidden="true" />
            <p className="type-display mt-4 text-lg">No cases yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-muted)]">
              Start by reporting your freeze. No account needed — takes 2 minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/start" className="u-btn u-btn-primary">
                Start my freeze review
              </Link>
              <Link href="/start" className="u-btn u-btn-ghost text-[var(--ink)]">
                New case
              </Link>
            </div>
          </Card>
        ) : (
          <div role="alert" className="u-alert u-alert-error">{error}</div>
        )
      ) : null}

      {loading ? (
        <ul className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <li key={i}>
              <Card className="p-5">
                <div className="u-skeleton h-5 w-28" />
                <div className="u-skeleton mt-4 h-3 w-full" />
                <div className="u-skeleton mt-4 h-2 w-full" />
              </Card>
            </li>
          ))}
        </ul>
      ) : cases.length === 0 && !error ? (
        <Card className="animate-fade-up px-8 py-14 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-[var(--ink-faint)]" strokeWidth={1.25} aria-hidden="true" />
          <p className="type-display mt-4 text-lg">No cases yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--ink-muted)]">
            Start with a quick freeze report — no account required. You stay in control of every step.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/start" className="u-btn u-btn-secondary">
              Quick freeze report
            </Link>
            <Link href="/start" className="u-btn u-btn-ghost text-[var(--ink)]">
              New case
            </Link>
          </div>
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {cases.map((item, i) => {
            const readiness = evidenceReadiness(item.evidence_count);
            return (
              <li key={item.id} className={cn('animate-fade-up', `stagger-${Math.min(i + 1, 5)}`)}>
                <Card interactive className="group flex h-full flex-col p-5">
                  <div className="flex flex-wrap items-start gap-2">
                    <Link
                      href={`/cases/${item.id}`}
                      className="type-mono-data font-semibold text-ink no-underline transition-colors duration-[140ms] ease-[var(--ease-out-expo)] group-hover:text-forest"
                    >
                      {item.public_id}
                    </Link>
                    <Badge tone={statusTone(item.status)}>{STATUS_LABELS[item.status] ?? item.status}</Badge>
                    {item.user_action_required ? <Badge tone="warn">Action needed</Badge> : null}
                  </div>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-xs text-[var(--ink-faint)]">
                      <span>Evidence readiness</span>
                      <span className="text-right">{readiness.label}</span>
                    </div>
                    <div
                      className="u-progress-track mt-2 h-1.5"
                      role="progressbar"
                      aria-valuenow={readiness.percent}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Evidence readiness for ${item.public_id}`}
                    >
                      <div
                        className={cn('u-progress-fill', readiness.barClass)}
                        style={{ width: `${readiness.percent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Link
                      href={`/cases/${item.id}`}
                      className="u-btn u-btn-ghost flex-1 gap-1 text-[var(--ink)] sm:flex-none"
                    >
                      View case
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                    </Link>
                    {item.user_action_required ? (
                      <Link href={`/cases/${item.id}`} className="u-btn u-btn-warn flex-1 sm:flex-none">
                        Take action
                      </Link>
                    ) : (
                      <Link
                        href={`/cases/${item.id}`}
                        className="u-btn u-btn-ghost flex-1 text-forest sm:flex-none"
                      >
                        Upload more
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}