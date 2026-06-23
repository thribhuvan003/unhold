'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { MoneyDisplay } from '@/components/ui/MoneyDisplay';
import { cn } from '@/lib/ui/cn';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/supabase/database.types';

type UserAction = Database['public']['Tables']['user_actions']['Row'];

type NextStepsCardProps = {
  caseId: string;
  initialActions: UserAction[];
  frozenAmountPaise?: number | null;
};

const POLL_MS = 30_000;

function openActions(actions: UserAction[]): UserAction[] {
  return actions
    .filter((a) => !a.completed_at && !a.dismissed_at)
    .sort((a, b) => b.priority - a.priority);
}

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

  const open = openActions(actions);
  const primary = open[0];
  const queuedCount = open.length - 1;

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
      className="u-next-steps animate-fade-up p-6 sm:p-7"
    >
      <div className="relative z-[1]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="u-icon-box u-icon-box-sky h-9 w-9">
              <Sparkles className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div>
              <h2 className="type-display text-lg text-sky-light">Today&apos;s action</h2>
              <p className="type-eyebrow mt-0.5 text-white/45">Your next step — you stay in control</p>
            </div>
          </div>
          <span className="u-status-live">
            <span className="u-live-dot" aria-hidden="true" />
            Live
          </span>
        </div>

        {primary ? (
          <div className="mt-6 animate-slide-in">
            <div className="flex items-start gap-3">
              <Circle
                className="mt-1 h-5 w-5 shrink-0 text-sky-light"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold leading-snug tracking-tight text-white">{primary.title}</p>
                {primary.description ? (
                  <p className="mt-2 text-sm leading-relaxed text-white/72">{primary.description}</p>
                ) : null}
              </div>
              {primary.priority >= 80 ? <Badge tone="warn">High priority</Badge> : null}
            </div>

            <button
              type="button"
              onClick={() => void completeAction(primary.id)}
              disabled={completingId === primary.id}
              className={cn('u-btn u-btn-primary mt-5')}
              style={{ minHeight: 44, minWidth: 44 }}
            >
              {completingId === primary.id ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Mark done
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex items-start gap-3 rounded-[var(--radius-md)] bg-white/8 p-4 backdrop-blur-sm">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sage)]" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-white/78">
              No pending actions — check back after the next swarm tick.
            </p>
          </div>
        )}

        <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-4">
          {frozenAmountPaise != null && frozenAmountPaise > 0 ? (
            <p className="type-caption text-white/55">
              Frozen amount{' '}
              <MoneyDisplay
                amountPaise={frozenAmountPaise}
                className="type-mono-data font-medium text-white/88"
              />
            </p>
          ) : null}
          {queuedCount > 0 ? (
            <p className="type-caption text-white/45">+{queuedCount} more in your inbox below</p>
          ) : null}
        </footer>
      </div>
    </section>
  );
}