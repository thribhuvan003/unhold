import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type AgentRole = Database['public']['Enums']['agent_role'];
type JobStatus = Database['public']['Enums']['job_status'] | string;

const FRESH = new Set(['pending', 'completed']);
/** Stuck mid-run longer than this may be reopened (deploy kill / hang). */
const STALE_RUNNING_MS = 15 * 60_000;

export type EnqueueInput = {
  case_id: string;
  job_type: string;
  agent_role: AgentRole;
  idempotency_key: string;
  payload?: Record<string, unknown>;
  scheduled_at?: string;
};

export type EnqueueResult = {
  enqueued: boolean;
  duplicate?: boolean;
  job_id?: string;
  requeued?: boolean;
};

/**
 * Idempotent agent job enqueue — UNIQUE on idempotency_key.
 * Terminal rows + stale running are reopened instead of blocking forever.
 * @see docs/BUILD_SPEC_LOOPS.md §8.2
 */
export async function enqueueAgentJob(input: EnqueueInput): Promise<EnqueueResult> {
  const supabase = createAdminClient();
  const when = input.scheduled_at ?? new Date().toISOString();

  const { data: existing } = await supabase
    .from('agent_jobs')
    .select('id, status, started_at')
    .eq('idempotency_key', input.idempotency_key)
    .maybeSingle();

  if (existing?.id) {
    const status = existing.status as JobStatus;
    const startedMs = existing.started_at
      ? Date.parse(existing.started_at)
      : 0;
    const staleRunning =
      status === 'running' &&
      startedMs > 0 &&
      Date.now() - startedMs >= STALE_RUNNING_MS;

    if (FRESH.has(status) || (status === 'running' && !staleRunning)) {
      return { enqueued: false, duplicate: true, job_id: existing.id };
    }

    const { error } = await supabase
      .from('agent_jobs')
      .update({
        status: 'pending',
        scheduled_at: when,
        started_at: null,
        completed_at: null,
        error_message: staleRunning ? 'requeued_stale_running' : null,
        payload_json: (input.payload ?? {}) as Json,
      })
      .eq('id', existing.id);

    if (error) throw new Error(`requeue_agent_job_failed: ${error.message}`);
    await kickSoon();
    return { enqueued: true, requeued: true, job_id: existing.id };
  }

  const { data, error } = await supabase
    .from('agent_jobs')
    .insert({
      case_id: input.case_id,
      job_type: input.job_type,
      agent_role: input.agent_role,
      idempotency_key: input.idempotency_key,
      payload_json: (input.payload ?? {}) as Json,
      status: 'pending',
      scheduled_at: when,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { enqueued: false, duplicate: true };
    }
    throw new Error(`enqueue_agent_job_failed: ${error.message}`);
  }

  await kickSoon();
  return { enqueued: true, job_id: data.id };
}

async function kickSoon() {
  try {
    const { scheduleJobKick } = await import('@/lib/jobs/kick');
    scheduleJobKick(8);
  } catch {
    // Cron still drains.
  }
}
