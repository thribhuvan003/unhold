'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/supabase/database.types';

type UserAction = Database['public']['Tables']['user_actions']['Row'];

type NextStepsCardProps = {
  caseId: string;
  initialActions: UserAction[];
  frozenAmountPaise?: number | null;
};

const POLL_MS = 30_000;

export function NextStepsCard({
  caseId,
  initialActions,
  frozenAmountPaise,
}: NextStepsCardProps) {
  const [actions, setActions] = useState<UserAction[]>(initialActions);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/user-actions`);
      if (!res.ok) return;
      const data = (await res.json()) as { actions: UserAction[] };
      setActions(data.actions);
    } catch {
      // poll fallback — ignore transient errors
    }
  }, [caseId]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`user_actions:${caseId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_actions',
          filter: `case_id=eq.${caseId}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();

    const poll = setInterval(() => void refresh(), POLL_MS);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [caseId, refresh]);

  const openActions = actions
    .filter((a) => !a.completed_at && !a.dismissed_at)
    .sort((a, b) => b.priority - a.priority);

  const primary = openActions[0];

  async function completeAction(actionId: string) {
    setCompletingId(actionId);
    try {
      await fetch(`/api/v1/cases/${caseId}/user-actions`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action_id: actionId, completed: true }),
      });
      await refresh();
    } finally {
      setCompletingId(null);
    }
  }

  return (
    <section
      data-testid="next-steps-card"
      style={{
        background: '#0B1F33',
        color: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: 18, color: '#E67E00' }}>Today&apos;s action</h2>

      {primary ? (
        <div>
          <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 16 }}>{primary.title}</p>
          {primary.description ? (
            <p style={{ margin: '0 0 12px', opacity: 0.85, fontSize: 14 }}>{primary.description}</p>
          ) : null}
          <button
            type="button"
            onClick={() => void completeAction(primary.id)}
            disabled={completingId === primary.id}
            style={{
              minHeight: 44,
              minWidth: 44,
              padding: '10px 16px',
              background: '#1F6B8A',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            {completingId === primary.id ? 'Saving…' : 'Mark done'}
          </button>
        </div>
      ) : (
        <p style={{ margin: 0, opacity: 0.8 }}>No pending actions — check back after the next swarm tick.</p>
      )}

      {frozenAmountPaise != null && frozenAmountPaise > 0 ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.7 }}>
          Frozen: ₹{(frozenAmountPaise / 100).toLocaleString('en-IN')}
        </p>
      ) : null}

      {openActions.length > 1 ? (
        <p style={{ margin: '12px 0 0', fontSize: 13, opacity: 0.7 }}>
          +{openActions.length - 1} more in your inbox
        </p>
      ) : null}
    </section>
  );
}