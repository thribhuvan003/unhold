import type { Database } from '@/supabase/database.types';

type CaseRow = Database['public']['Tables']['cases']['Row'];

export const TERMINAL_STATUSES = ['resolved', 'closed'] as const;
export type TerminalStatus = (typeof TERMINAL_STATUSES)[number];

export type TerminationReason =
  | 'terminal_status'
  | 'erasure_complete'
  | 'human_escalation_permanent'
  | 'max_case_age';

function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Hard stop predicates for the OUTER product loop.
 * Returns null when the case may continue ticking.
 */
export function shouldTerminateLoop(caseRow: CaseRow): TerminationReason | null {
  if (TERMINAL_STATUSES.includes(caseRow.status as TerminalStatus)) {
    return 'terminal_status';
  }
  if (caseRow.erasure_completed_at) {
    return 'erasure_complete';
  }
  const meta =
    typeof caseRow.metadata_json === 'object' && caseRow.metadata_json !== null
      ? (caseRow.metadata_json as Record<string, unknown>)
      : {};
  if (caseRow.status === 'human_escalation' && meta.ops_automation_off === true) {
    return 'human_escalation_permanent';
  }
  if (daysSince(caseRow.created_at) > 365 && caseRow.status === 'stalled') {
    return 'max_case_age';
  }
  return null;
}