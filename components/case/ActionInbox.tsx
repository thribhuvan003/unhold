'use client';

import { Inbox, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/ui/cn';
import type { Database } from '@/supabase/database.types';

type UserAction = Database['public']['Tables']['user_actions']['Row'];

type ActionInboxProps = {
  actions: UserAction[];
};

function openActions(actions: UserAction[]): UserAction[] {
  return actions
    .filter((a) => !a.completed_at && !a.dismissed_at)
    .sort((a, b) => b.priority - a.priority);
}

function priorityTone(priority: number): 'warn' | 'forest' | 'neutral' {
  if (priority >= 80) return 'warn';
  if (priority >= 50) return 'forest';
  return 'neutral';
}

export function ActionInbox({ actions }: ActionInboxProps) {
  const open = openActions(actions);
  const secondary = open.slice(1);

  if (open.length === 0) {
    return (
      <section data-testid="action-inbox" className="animate-fade-up stagger-2">
        <Card className="flex items-center gap-4 px-5 py-5">
          <div className="u-icon-box u-icon-box-forest h-10 w-10 shrink-0">
            <ListChecks className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
          </div>
          <div>
            <h3 className="type-display text-base">Action inbox</h3>
            <p className="mt-0.5 text-sm text-[var(--ink-muted)]">All caught up.</p>
          </div>
        </Card>
      </section>
    );
  }

  if (secondary.length === 0) {
    return null;
  }

  return (
    <section data-testid="action-inbox" className="animate-fade-up stagger-2">
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-[var(--ink-faint)]" strokeWidth={1.5} aria-hidden="true" />
        <h3 className="type-display text-base">Up next in your queue</h3>
        <Badge tone="neutral">{secondary.length}</Badge>
      </div>

      <Card className="divide-y divide-[var(--border)] overflow-hidden">
        <ul className="m-0 list-none p-0">
          {secondary.map((action, index) => (
            <li
              key={action.id}
              className={cn('u-queue-item animate-fade-up', `stagger-${Math.min(index + 1, 5)}`)}
            >
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--border-strong)]"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm font-medium text-[var(--ink)]">{action.title}</strong>
                  <Badge tone={priorityTone(action.priority)}>P{action.priority}</Badge>
                </div>
                {action.description ? (
                  <p className="mt-1 text-sm leading-relaxed text-[var(--ink-muted)]">{action.description}</p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}