import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { routeCaseJobs } from "@/lib/agents/router";
import { enqueueAgentJob } from "@/lib/jobs/enqueue";
import { acquireCaseTickLock, releaseCaseTickLock } from "@/lib/loops/locks";
import { computeNextCheckAt } from "@/lib/loops/scheduling";
import {
  shouldTerminateLoop,
  TERMINAL_STATUSES,
} from "@/lib/loops/termination";
import { appendSwarmEvent } from "@/lib/swarm/append-event";
import { sendDeadlineReminderForCase } from "@/lib/email/send";
import type { CaseTickResult, TickTrigger } from "@/lib/loops/tick-types";
import type { Database, Json } from "@/supabase/database.types";

type CaseRow = Database["public"]["Tables"]["cases"]["Row"];

export type { TickTrigger, CaseTickResult } from "@/lib/loops/tick-types";

function floorTo15MinBucket(d: Date): string {
  const t = new Date(d);
  t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 15) * 15, 0, 0);
  return t.toISOString().slice(0, 16);
}

async function hasPendingHumanGate(caseId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("human_gate_queue")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("status", "pending");
  return (count ?? 0) > 0;
}

/**
 * INNER LOOP entry — one case, one tick.
 * @see docs/BUILD_SPEC_LOOPS.md §2.1
 */
export async function runCaseTick(
  caseId: string,
  trigger: TickTrigger = { type: "cron" },
): Promise<CaseTickResult> {
  const supabase = createAdminClient();
  const tickId = crypto.randomUUID();

  const locked = await acquireCaseTickLock(caseId, 120);
  if (!locked) {
    return { exit: "skipped", reason: "concurrent_tick" };
  }

  try {
    const { data: caseRow, error } = await supabase
      .from("cases")
      .select("*")
      .eq("id", caseId)
      .single();

    if (error || !caseRow) {
      throw new Error(`case_not_found: ${caseId}`);
    }

    const termination = shouldTerminateLoop(caseRow);
    if (
      termination ||
      TERMINAL_STATUSES.includes(
        caseRow.status as (typeof TERMINAL_STATUSES)[number],
      )
    ) {
      return { exit: "skipped", reason: "terminal" };
    }

    if (caseRow.swarm_paused) {
      return { exit: "skipped", reason: "paused" };
    }

    const now = new Date();
    if (
      trigger.type === "cron" &&
      caseRow.next_check_at &&
      new Date(caseRow.next_check_at) > now
    ) {
      return { exit: "skipped", reason: "not_due" };
    }

    if (await hasPendingHumanGate(caseId)) {
      const pollAt = new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString();
      await supabase
        .from("cases")
        .update({
          next_check_at: pollAt,
        } as Database["public"]["Tables"]["cases"]["Update"])
        .eq("id", caseId);
      return { exit: "skipped", reason: "human_gate" };
    }

    // Deadline-lapse hook: if the user opted in and a user-action deadline has
    // lapsed, email them ONE reminder about their own case. Idempotent (never
    // double-sends the same deadline) and best-effort — a reminder failure must
    // never fail the tick, and this only ever emails the USER, never a bank.
    try {
      await sendDeadlineReminderForCase(caseRow as CaseRow);
    } catch {
      // swallow — reminders are non-critical; the daily cron will retry
    }

    const routePlan = await routeCaseJobs(caseRow as CaseRow, trigger);
    const nextCheckAt = computeNextCheckAt(
      caseRow as CaseRow,
      routePlan,
    ).toISOString();

    const priorMeta =
      typeof caseRow.metadata_json === "object" &&
      caseRow.metadata_json !== null
        ? (caseRow.metadata_json as Record<string, unknown>)
        : {};

    await supabase
      .from("cases")
      .update({
        next_check_at: nextCheckAt,
        last_activity_at: now.toISOString(),
        metadata_json: {
          ...priorMeta,
          last_tick_id: tickId,
          last_tick_trigger: trigger,
        } as Json,
      } as Database["public"]["Tables"]["cases"]["Update"])
      .eq("id", caseId);

    const bucket = floorTo15MinBucket(now);
    const jobsEnqueued: string[] = [];

    for (const job of routePlan.jobs) {
      if (!job.enqueue) continue;

      const idempotencyKey =
        job.idempotency_key ??
        `${job.job_type}:${caseId}:${job.idempotency_bucket ?? bucket}`;

      const result = await enqueueAgentJob({
        case_id: caseId,
        job_type: job.job_type,
        agent_role: job.agent_role,
        idempotency_key: idempotencyKey,
        payload: job.payload ?? {},
        scheduled_at: job.scheduled_at,
      });

      if (result.enqueued && result.job_id) {
        jobsEnqueued.push(result.job_id);
      }
    }

    await appendSwarmEvent({
      case_id: caseId,
      agent_role: "HUMAN_OPS",
      event_type: "tick_completed",
      severity: "info",
      message: `Monitor tick ${tickId}: ${jobsEnqueued.length} job(s) enqueued`,
      automated: true,
      metadata: {
        tick_id: tickId,
        trigger,
        jobs_enqueued: jobsEnqueued,
        route_plan: routePlan,
      },
    });

    return {
      exit: "completed",
      tick_id: tickId,
      case_id: caseId,
      jobs_enqueued: jobsEnqueued,
      next_check_at: nextCheckAt,
      route_plan: routePlan,
    };
  } finally {
    await releaseCaseTickLock(caseId);
  }
}

/**
 * OUTER LOOP batch driver — cron entry.
 */
export async function runBatchCaseTicks(options?: {
  limit?: number;
  trigger?: TickTrigger;
}): Promise<{ processed: number; results: CaseTickResult[] }> {
  const supabase = createAdminClient();
  const limit = options?.limit ?? 50;
  const now = new Date().toISOString();

  const { data: dueCases } = await supabase
    .from("cases")
    .select("id")
    .lte("next_check_at", now)
    .not("status", "in", `(${TERMINAL_STATUSES.join(",")})`)
    .eq("swarm_paused", false)
    .order("next_check_at", { ascending: true })
    .limit(limit);

  const results: CaseTickResult[] = [];
  for (const row of dueCases ?? []) {
    results.push(
      await runCaseTick(row.id, options?.trigger ?? { type: "cron" }),
    );
  }

  return { processed: results.length, results };
}
