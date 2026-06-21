'use client';

import { useState } from 'react';
import { SwarmLogPanel } from '@/components/case/SwarmLogPanel';
import type { Database } from '@/supabase/database.types';

type SwarmEvent = Database['public']['Tables']['swarm_events']['Row'];

type CaseDetailTabsProps = {
  events: SwarmEvent[];
};

const TAB_BUTTON_STYLE = {
  minHeight: 44,
  padding: '8px 16px',
  border: 'none',
  background: 'none',
  fontSize: 14,
  cursor: 'pointer',
} as const;

export function CaseDetailTabs({ events }: CaseDetailTabsProps) {
  const [tab, setTab] = useState<'overview' | 'details'>('overview');

  return (
    <div style={{ marginTop: 16 }}>
      <div role="tablist" style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb' }}>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'overview'}
          data-testid="overview-tab"
          onClick={() => setTab('overview')}
          style={{ ...TAB_BUTTON_STYLE, fontWeight: tab === 'overview' ? 700 : 400 }}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'details'}
          data-testid="details-tab"
          onClick={() => setTab('details')}
          style={{ ...TAB_BUTTON_STYLE, fontWeight: tab === 'details' ? 700 : 400 }}
        >
          Details
        </button>
      </div>
      {tab === 'details' ? <SwarmLogPanel events={events} /> : null}
    </div>
  );
}
