import "server-only";

import { runAgentJob } from "@/lib/agents/runner";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/supabase/database.types";

type AgentJobRow = Database["public"]["Tables"]["agent_jobs"]["Row"];

const DEFAULT_BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 60_000;
const RETRY_MAX_DELAY_MS = 30 * 60_000;

type JobFailureTransition = Pick<
  AgentJobRow,
  "status" | "scheduled_at" | "completed_at"
>;

export function getJobFailureTransition(input: {
  attempts: number;
  maxAttempts: number;
  failedAt: Date;
}): JobFailureTransition {
  const failedAtIso = input.failedAt.toISOString();
  if (input.attempts >= input.maxAttempts) {
    return {
      status: "dead_letter",
      scheduled_at: failedAtIso,
      completed_at: failedAtIso,
    };
  }

  const delayMs = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** Math.max(0, input.attempts - 1),
    RETRY_MAX_DELAY_MS,
  );
  return {
    status: "pending",
    scheduled_at: new Date(input.failedAt.getTime() + delayMs).toISOString(),
    completed_at: null,
  };
}

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
    .from("agent_jobs")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
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

  const { data: claimed, error: lockError } = await supabase.rpc(
    "claim_agent_job_for_processing",
    { p_job_id: job.id, p_started_at: new Date().toISOString() },
  );

  if (lockError || !claimed) return false;

  const { data: caseRow } = await supabase
    .from("cases")
    .select("erasure_requested_at")
    .eq("id", job.case_id)
    .maybeSingle();

  if (!caseRow || caseRow.erasure_requested_at) {
    await supabase
      .from("agent_jobs")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", job.id);
    return true;
  }

  try {
    const result = await runAgentJob(job);
    await supabase
      .from("agent_jobs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result_json: result.output as Json,
        cost_usd: result.cost_usd ?? job.cost_usd,
      })
      .eq("id", job.id);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    const attempts = job.attempts + 1;
    const transition = getJobFailureTransition({
      attempts,
      maxAttempts: job.max_attempts || MAX_ATTEMPTS,
      failedAt: new Date(),
    });

    await supabase
      .from("agent_jobs")
      .update({
        ...transition,
        error_message: message,
        started_at: transition.status === "pending" ? null : job.started_at,
      })
      .eq("id", job.id);

    return false;
  }
}
