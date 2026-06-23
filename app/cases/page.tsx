'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
  public_pressure: 'Public pressure stage',
};

const MIN_EVIDENCE_FOR_READY = 2;

function statusBadgeClasses(status: string): string {
  if (status === 'resolved' || status === 'verified') return 'bg-emerald-100 text-emerald-800';
  if (status === 'stalled' || status === 'human_escalation') return 'bg-amber-100 text-amber-800';
  if (status === 'closed') return 'bg-slate-200 text-slate-700';
  return 'bg-[#1F6B8A]/10 text-[#1F6B8A]';
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/v1/cases');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to load cases');
        return;
      }
      setCases(json.cases ?? []);
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1F33]">My cases</h1>
        <Link href="/cases/new" className="min-h-[44px] rounded bg-[#1F6B8A] px-4 py-2 text-white no-underline">
          New case
        </Link>
      </div>
      {error ? <p className="text-red-700">{error}</p> : null}
      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {cases.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link href={`/cases/${item.id}`} className="font-medium no-underline">
                  {item.public_id}
                </Link>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClasses(item.status)}`}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
                {item.user_action_required ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    Action needed
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {item.evidence_count} document{item.evidence_count === 1 ? '' : 's'} uploaded
                {item.evidence_count < MIN_EVIDENCE_FOR_READY ? ' — more evidence will help your case' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/cases/${item.id}`}
                className="min-h-[44px] rounded border border-slate-300 px-3 py-2 text-sm font-medium text-[#0B1F33] no-underline"
              >
                View
              </Link>
              {item.user_action_required ? (
                <Link
                  href={`/cases/${item.id}`}
                  className="min-h-[44px] rounded bg-amber-500 px-3 py-2 text-sm font-medium text-white no-underline"
                >
                  Take action
                </Link>
              ) : null}
            </div>
          </li>
        ))}
        {cases.length === 0 && !error ? (
          <li className="px-4 py-6 text-sm text-slate-500">No cases yet. Start a guest report or create a new case.</li>
        ) : null}
      </ul>
    </section>
  );
}
