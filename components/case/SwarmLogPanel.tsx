'use client';

import { useMemo, useState } from 'react';
import { Bot } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/ui/cn';
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

const AGENT_TONES: Record<AgentRole, 'forest' | 'neutral' | 'terracotta' | 'warn'> = {
  INTAKE: 'terracotta',
  MONITOR: 'forest',
  EVIDENCE: 'forest',
  DRAFTER: 'neutral',
  ESCALATOR: 'warn',
  VERIFIER: 'forest',
  PRESSURE: 'warn',
  HUMAN_OPS: 'warn',
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

function formatDateGroup(value: string): string {
  try {
    const date = new Date(value);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' });
  } catch {
    return 'Earlier';
  }
}

function severityConfig(severity: SwarmEvent['severity']): {
  badge: string | null;
  badgeTone: 'warn' | 'error' | null;
  cardClass: string;
  dotClass: string;
} {
  switch (severity) {
    case 'human_required':
      return {
        badge: 'Needs your attention',
        badgeTone: 'warn',
        cardClass: 'border-[var(--warn)]/30 bg-[var(--warn-muted)]',
        dotClass: 'bg-[var(--warn)] ring-[var(--warn-muted)]',
      };
    case 'warn':
      return {
        badge: 'Flagged',
        badgeTone: 'warn',
        cardClass: 'border-[var(--warn)]/20 bg-[var(--paper)]',
        dotClass: 'bg-[var(--saffron)] ring-[var(--warn-muted)]',
      };
    case 'error':
      return {
        badge: 'Issue',
        badgeTone: 'error',
        cardClass: 'border-[var(--error)]/25 bg-[var(--error-muted)]',
        dotClass: 'bg-[var(--error)] ring-[var(--error-muted)]',
      };
    default:
      return {
        badge: null,
        badgeTone: null,
        cardClass: 'border-[var(--border)] bg-[var(--surface-raised)]',
        dotClass: 'bg-[var(--forest)] ring-[var(--forest-muted)]',
      };
  }
}

function groupEventsByDate(events: SwarmEvent[]): Array<{ dateLabel: string; events: SwarmEvent[] }> {
  const groups = new Map<string, SwarmEvent[]>();
  for (const event of events) {
    const label = formatDateGroup(event.created_at);
    const existing = groups.get(label) ?? [];
    existing.push(event);
    groups.set(label, existing);
  }
  return Array.from(groups.entries()).map(([dateLabel, grouped]) => ({ dateLabel, events: grouped }));
}

export function SwarmLogPanel({ events }: SwarmLogPanelProps) {
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const visibleEvents = useMemo(
    () =>
      flaggedOnly
        ? events.filter(
            (event) =>
              event.severity === 'human_required' || event.severity === 'warn' || event.severity === 'error',
          )
        : events,
    [events, flaggedOnly],
  );

  const groupedEvents = useMemo(() => groupEventsByDate(visibleEvents), [visibleEvents]);
  const flaggedCount = events.filter(
    (e) => e.severity === 'human_required' || e.severity === 'warn' || e.severity === 'error',
  ).length;

  return (
    <section data-testid="swarm-log-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="type-display text-lg">AI Activity</h3>
          <p className="type-caption mt-1 text-[0.875rem] text-ink-muted">
            What our AI agents have done on your case so far. Humans review anything flagged before it goes
            anywhere.
          </p>
        </div>
        {events.length > 0 && flaggedCount > 0 ? (
          <Badge tone="warn">{flaggedCount} flagged</Badge>
        ) : null}
      </div>

      {events.length > 0 ? (
        <label className="mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] text-sm text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]">
          <input
            type="checkbox"
            checked={flaggedOnly}
            onChange={(e) => setFlaggedOnly(e.target.checked)}
            className="h-4 w-4 accent-[var(--forest)]"
          />
          Show only flagged items
        </label>
      ) : null}

      {events.length === 0 ? (
        <div className="u-empty mt-5">
          <Bot className="mx-auto h-8 w-8 text-[var(--ink-faint)]" strokeWidth={1.25} aria-hidden="true" />
          <p className="mt-3 text-sm text-[var(--ink-muted)]">No AI activity yet.</p>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Activity will appear here after intake classification or evidence checks.
          </p>
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--paper)] px-6 py-8 text-center">
          <p className="text-sm text-[var(--ink-muted)]">Nothing flagged so far.</p>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            That&apos;s a good sign — toggle the filter off to see all activity.
          </p>
        </div>
      ) : (
        <div className="mt-5 space-y-8">
          {groupedEvents.map((group) => (
            <div key={group.dateLabel}>
              <h4 className="type-eyebrow text-ink-faint">{group.dateLabel}</h4>
              <ol className="relative mt-4 space-y-0">
                {group.events.map((event, index) => {
                  const severity = severityConfig(event.severity);
                  const agentTone = AGENT_TONES[event.agent_role] ?? 'neutral';
                  const isLast = index === group.events.length - 1;

                  return (
                    <li
                      key={event.id}
                      className={cn('relative flex gap-3 pb-5 animate-fade-up', `stagger-${Math.min(index + 1, 5)}`)}
                    >
                      {!isLast ? <span className="u-timeline-rail" aria-hidden="true" /> : null}
                      <span
                        className={cn('u-timeline-dot ring-4', severity.dotClass)}
                        aria-hidden="true"
                      />
                      <div className={cn('u-timeline-card', severity.cardClass)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={agentTone}>{AGENT_LABELS[event.agent_role] ?? event.agent_role}</Badge>
                          {severity.badge && severity.badgeTone ? (
                            <Badge tone={severity.badgeTone}>{severity.badge}</Badge>
                          ) : null}
                          <time dateTime={event.created_at} className="type-mono-data ml-auto text-[0.6875rem] text-ink-faint">
                            {formatTimestamp(event.created_at)}
                          </time>
                        </div>
                        <p className="mt-2.5 text-sm leading-relaxed text-[var(--ink)]">{event.message}</p>
                        {event.automated ? (
                          <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
                            Automated — you review before any action is taken.
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}