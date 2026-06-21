import 'server-only';

import { runAgentJob } from '@/lib/agents/runner';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

const DEFAULT_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;

/**
 * Drain pending agent_jobs — called by cron POST /internal/jobs/process.
 * @see docs/BUILD_SPEC_LOOPS.md §3 AGENT LOOP
 */
export async function processAgentJobs(options?: {
  limit?: number;
}): Promise<{ processed: number; succeeded: number; failed: number }> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? DEFAULT_BATCH_SIZE;
  const now = new Date().toISOString();

  const { data: jobs } = await supabase
    .from('agent_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_at', now)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  let succeeded = 0;
  let failed = 0;

  for (const job of jobs ?? []) {
    const ok = await processOneJob(job as AgentJobRow);
    if (ok) succeeded += 1;
    else failed += 1;
  }

  return { processed: (jobs ?? []).length, succeeded, failed };
}

async function processOneJob(job: AgentJobRow): Promise<boolean> {
  const supabase = createAdminClient();

  const { error: lockError } = await supabase
    .from('agent_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      attempts: job.attempts + 1,
    })
    .eq('id', job.id)
    .eq('status', 'pending');

  if (lockError) return false;

  try {
    const result = await runAgentJob(job);
    await supabase
      .from('agent_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_json: result.output as Json,
        cost_usd: result.cost_usd ?? job.cost_usd,
      })
      .eq('id', job.id);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    const attempts = job.attempts + 1;
    const terminal = attempts >= (job.max_attempts || MAX_ATTEMPTS);

    await supabase
      .from('agent_jobs')
      .update({
        status: terminal ? 'dead_letter' : 'failed',
        error_message: message,
        completed_at: terminal ? new Date().toISOString() : null,
      })
      .eq('id', job.id);

    return false;
  }
}