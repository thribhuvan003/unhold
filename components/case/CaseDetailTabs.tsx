'use client';

import { useState, type ReactNode } from 'react';
import { SwarmLogPanel } from '@/components/case/SwarmLogPanel';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/ui/cn';
import type { Database } from '@/supabase/database.types';

type SwarmEvent = Database['public']['Tables']['swarm_events']['Row'];

type CaseDetailTabsProps = {
  events: SwarmEvent[];
};

export function CaseDetailTabs({ events }: CaseDetailTabsProps) {
  const [tab, setTab] = useState<'overview' | 'details'>('overview');

  const flaggedCount = events.filter(
    (e) => e.severity === 'human_required' || e.severity === 'warn' || e.severity === 'error',
  ).length;

  return (
    <div className="u-card overflow-hidden">
      <div role="tablist" aria-label="Case information" className="flex border-b border-[var(--border)] bg-[var(--paper)]">
        <TabButton id="overview-tab" selected={tab === 'overview'} onClick={() => setTab('overview')} controls="overview-panel">
          Overview
        </TabButton>
        <TabButton
          id="details-tab"
          selected={tab === 'details'}
          onClick={() => setTab('details')}
          controls="details-panel"
          badge={flaggedCount > 0 ? flaggedCount : undefined}
        >
          AI Activity
        </TabButton>
      </div>

      <div className="p-5 sm:p-6">
        {tab === 'overview' ? (
          <div
            id="overview-panel"
            role="tabpanel"
            aria-labelledby="overview-tab"
            className="type-lead animate-fade-in text-[0.9375rem]"
          >
            <p>
              Use the sections above to upload evidence and complete any actions in your inbox. Switch to{' '}
              <strong className="font-medium text-[var(--ink)]">AI Activity</strong> to see what our agents have
              checked or flagged.
            </p>
            {events.length > 0 ? (
              <p className="type-mono-data type-caption mt-4">
                {events.length} event{events.length === 1 ? '' : 's'} recorded
                {flaggedCount > 0 ? ` — ${flaggedCount} need${flaggedCount === 1 ? 's' : ''} attention` : ''}
              </p>
            ) : (
              <p className="mt-4 text-xs text-[var(--ink-faint)]">
                No AI activity yet — upload evidence or wait for intake classification.
              </p>
            )}
          </div>
        ) : null}

        {tab === 'details' ? (
          <div id="details-panel" role="tabpanel" aria-labelledby="details-tab">
            <SwarmLogPanel events={events} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TabButton({
  id,
  selected,
  onClick,
  controls,
  children,
  badge,
}: {
  id: string;
  selected: boolean;
  onClick: () => void;
  controls: string;
  children: ReactNode;
  badge?: number;
}) {
  return (
    <button
      type="button"
      id={id}
      role="tab"
      aria-selected={selected}
      aria-controls={controls}
      data-testid={id}
      onClick={onClick}
      className={cn('u-tab sm:flex-none sm:px-6', selected && 'u-tab-selected')}
    >
      {selected ? <span className="u-tab-indicator sm:left-6 sm:right-6" /> : null}
      <span className="inline-flex items-center gap-2">
        {children}
        {badge !== undefined ? <Badge tone="warn">{badge}</Badge> : null}
      </span>
    </button>
  );
}