'use client';

import type { Database } from '@/supabase/database.types';

type SwarmEvent = Database['public']['Tables']['swarm_events']['Row'];

type SwarmLogPanelProps = {
  events: SwarmEvent[];
};

export function SwarmLogPanel({ events }: SwarmLogPanelProps) {
  return (
    <section data-testid="swarm-log-panel" style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 16, marginBottom: 8 }}>Swarm log</h3>
      {events.length === 0 ? (
        <p style={{ opacity: 0.7, fontSize: 14 }}>No swarm events yet.</p>
      ) : (
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {events.map((event) => (
            <li key={event.id} style={{ marginBottom: 8, fontSize: 14 }}>
              <span style={{ opacity: 0.6 }}>{event.agent_role}</span> — {event.message}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}