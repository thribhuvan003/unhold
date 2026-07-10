import { addDays, addHours, subDays } from 'date-fns';

import type { RoutePlan } from '@/lib/agents/router';
import type { Database } from '@/supabase/database.types';

type CaseRow = Database['public']['Tables']['cases']['Row'];

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function now(): Date {
  return new Date();
}

/**
 * Compute next inner-loop wake time after a monitor tick.
 * @see docs/BUILD_SPEC_LOOPS.md §2.3
 */
export function computeNextCheckAt(caseRow: CaseRow, _routePlan?: RoutePlan): Date {
  const days = daysSince(caseRow.created_at);

  if (caseRow.status === 'awaiting_response') {
    const meta =
      typeof caseRow.metadata_json === 'object' && caseRow.metadata_json !== null
        ? (caseRow.metadata_json as Record<string, unknown>)
        : {};
    const dueAt = meta.escalation_response_due_at;
    if (typeof dueAt === 'string') {
      return subDays(new Date(dueAt), 1);
    }
  }

  if (caseRow.status === 'stalled') {
    return addDays(now(), 14);
  }

  if (days <= 7) return addHours(now(), 24);
  if (days <= 30) return addDays(now(), 3);
  if (days <= 90) return addDays(now(), 7);
  return addDays(now(), 14);
}