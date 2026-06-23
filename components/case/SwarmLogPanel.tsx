'use client';

import { useMemo, useState } from 'react';
import type { Database } from '@/supabase/database.types';

type SwarmEvent = Database['public']['Tables']['swarm_events']['Row'];
type AgentRole = Database['public']['Enums']['agent_role'];

type SwarmLogPanelProps = {
  events: SwarmEvent[];
};

const AGENT_LABELS: Record<AgentRole, string> = {
  INTAKE: 'Intake',
  MONITOR: 'Monitoring',
  EVIDENCE: 'Evidence bundle',
  DRAFTER: 'Letter drafting',
  ESCALATOR: 'Escalation',
  VERIFIER: 'Document check',
  PRESSURE: 'Public pressure',
  HUMAN_OPS: 'Human review',
};

function formatTimestamp(value: string): string {
  try {
    return new Date(value).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

function severityBadge(severity: SwarmEvent['severity']): string | null {
  switch (severity) {
    case 'human_required':
      return 'Needs your attention';
    case 'warn':
      return 'Flagged';
    case 'error':
      return 'Issue';
    default:
      return null;
  }
}

export function SwarmLogPanel({ events }: SwarmLogPanelProps) {
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const visibleEvents = useMemo(
    () =>
      flaggedOnly
        ? events.filter((event) => event.severity === 'human_required' || event.severity === 'warn' || event.severity === 'error')
        : events,
    [events, flaggedOnly],
  );

  return (
    <section data-testid="swarm-log-panel" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 4 }}>AI Activity</h3>
      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 8 }}>
        What our AI agents have done on your case so far. Humans review anything flagged before it goes anywhere.
      </p>

      {events.length > 0 ? (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
          />
          Show only flagged items
        </label>
      ) : null}

      {events.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: 14 }}>No AI activity yet.</p>
      ) : visibleEvents.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: 14 }}>Nothing flagged so far.</p>
      ) : (
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {visibleEvents.map((event) => {
            const badge = severityBadge(event.severity);
            return (
              <li key={event.id} style={{ marginBottom: 10, fontSize: 14 }}>
                <div>
                  <strong>{AGENT_LABELS[event.agent_role] ?? event.agent_role}</strong> — {event.message}
                  {badge ? (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 12,
                        padding: '1px 6px',
                        borderRadius: 4,
                        background: event.severity === 'human_required' ? '#FEF3C7' : '#FEE2E2',
                        color: '#7C2D12',
                      }}
                    >
                      {badge}
                    </span>
                  ) : null}
                </div>
                <div style={{ opacity: 0.6, fontSize: 12 }}>{formatTimestamp(event.created_at)}</div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
