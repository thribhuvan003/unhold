import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type AgentRole = Database['public']['Enums']['agent_role'];

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
};

/**
 * Idempotent agent job enqueue — UNIQUE on idempotency_key.
 * @see docs/BUILD_SPEC_LOOPS.md §8.2
 */
export async function enqueueAgentJob(input: EnqueueInput): Promise<EnqueueResult> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('agent_jobs')
    .select('id')
    .eq('idempotency_key', input.idempotency_key)
    .maybeSingle();

  if (existing?.id) {
    return { enqueued: false, duplicate: true, job_id: existing.id };
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
      scheduled_at: input.scheduled_at ?? new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return { enqueued: false, duplicate: true };
    }
    throw new Error(`enqueue_agent_job_failed: ${error.message}`);
  }

  return { enqueued: true, job_id: data.id };
}