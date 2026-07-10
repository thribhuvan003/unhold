import 'server-only';

import { toZonedTime } from 'date-fns-tz';
import { MonitorTickOutputSchema, type MonitorTickOutput } from '@/lib/agents/schemas';
import { MONITOR_SYSTEM_PROMPT } from '@/lib/agents/prompts/monitor';
import { createUserAction } from '@/lib/user-actions/create';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/supabase/database.types';

const IST_TIMEZONE = 'Asia/Kolkata';
const QUIET_HOUR_START = 22;
const QUIET_HOUR_END = 8;

export type MonitorRunInput = {
  case_id: string;
  case_status?: Database['public']['Enums']['case_status'];
  escalation_response_due_at?: string | null;
  job_id?: string;
};

function isQuietHoursIst(now = new Date()): boolean {
  const ist = toZonedTime(now, IST_TIMEZONE);
  const hour = ist.getHours();
  return hour >= QUIET_HOUR_START || hour < QUIET_HOUR_END;
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function buildRuleBasedTick(
  caseRow: Database['public']['Tables']['cases']['Row'],
  responseDueAt: string | null,
): MonitorTickOutput {
  const quiet = isQuietHoursIst();

  if (caseRow.status === 'awaiting_response' && responseDueAt) {
    const due = new Date(responseDueAt);
    if (due > new Date()) {
      return {
        message: `Waiting for bank response until ${due.toLocaleDateString('en-IN')}. Check SMS/email for updates.`,
        user_action_required: false,
        action_code: 'await_response',
        action_title: 'Wait for bank response',
        suggest_status_transition: null,
        quiet_hours_suppressed: quiet,
      };
    }
    return {
      message: 'Response deadline passed. Review next escalation steps in your case dashboard.',
      user_action_required: true,
      action_code: 'review_timeout',
      action_title: 'Review overdue escalation',
      suggest_status_transition: null,
      quiet_hours_suppressed: quiet,
    };
  }

  const age = daysSince(caseRow.created_at);
  if (age <= 7) {
    return {
      message: 'Complete today\'s checklist item to keep your case moving.',
      user_action_required: true,
      action_code: 'daily_checklist',
      action_title: 'Complete checklist',
      suggest_status_transition: null,
      quiet_hours_suppressed: quiet,
    };
  }

  return {
    message: 'Your case is still active. Review next steps when you have a moment.',
    user_action_required: false,
    suggest_status_transition: null,
    quiet_hours_suppressed: quiet,
  };
}

/**
 * MONITOR agent runner — creates user_actions only; never auto-sends.
 */
export async function runMonitorTick(input: MonitorRunInput): Promise<MonitorTickOutput> {
  const supabase = createAdminClient();
  const { data: caseRow, error } = await supabase
    .from('cases')
    .select('*')
    .eq('id', input.case_id)
    .single();

  if (error || !caseRow) {
    throw new Error(`monitor_case_not_found: ${input.case_id}`);
  }

  let responseDueAt = input.escalation_response_due_at ?? null;
  if (!responseDueAt && caseRow.status === 'awaiting_response') {
    const { data: sentEscalation } = await supabase
      .from('escalations')
      .select('response_due_at')
      .eq('case_id', input.case_id)
      .eq('status', 'sent')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    responseDueAt = sentEscalation?.response_due_at ?? null;
  }

  const output = buildRuleBasedTick(caseRow, responseDueAt);
  MonitorTickOutputSchema.parse(output);

  if (output.user_action_required && !output.quiet_hours_suppressed) {
    await createUserAction({
      case_id: input.case_id,
      action_type: 'respond_monitoring',
      title: output.action_title ?? 'Action required',
      description: output.message,
      priority: output.action_code === 'review_timeout' ? 80 : 40,
      due_at: responseDueAt ?? undefined,
      metadata: { action_code: output.action_code, agent: 'MONITOR' },
    });
  }

  await appendSwarmEvent({
    case_id: input.case_id,
    agent_role: 'MONITOR',
    event_type: 'monitor_tick',
    severity: 'info',
    message: output.message,
    job_id: input.job_id ?? null,
    metadata: {
      quiet_hours_suppressed: output.quiet_hours_suppressed,
      prompt_ref: MONITOR_SYSTEM_PROMPT.slice(0, 80),
    },
  });

  return output;
}

/**
 * Day-bucket reminder pass — respects quiet hours; user_actions only.
 */
export async function runReminderBatch(options?: { limit?: number }): Promise<{
  processed: number;
  suppressed: number;
}> {
  if (isQuietHoursIst()) {
    return { processed: 0, suppressed: 0 };
  }

  const supabase = createAdminClient();
  const limit = options?.limit ?? 100;
  const now = new Date().toISOString();

  const { data: cases } = await supabase
    .from('cases')
    .select('id')
    .in('status', ['monitoring', 'evidence_building', 'awaiting_response', 'stalled'])
    .lte('next_check_at', now)
    .eq('swarm_paused', false)
    .limit(limit);

  let processed = 0;
  let suppressed = 0;

  for (const row of cases ?? []) {
    const result = await runMonitorTick({ case_id: row.id });
    if (result.quiet_hours_suppressed) suppressed += 1;
    else processed += 1;
  }

  return { processed, suppressed };
}