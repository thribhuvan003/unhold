import { assertCronAuth } from '@/lib/api/cron-auth';
import { processAgentJobs } from '@/lib/jobs/process';
import { runErasureBatch } from '@/lib/data-rights/erasure';

/**
 * Hobby functions die at ~300s. Keep headroom: GHA curl max-time is 280s.
 * More backlog drains on the next 5m cron + reclaimStaleRunningJobs.
 */
const DRAIN_ROUNDS = 2;
const WALL_MS = 240_000;

async function processJobs(limit?: number) {
  const started = Date.now();
  const erasures = await runErasureBatch();
  const totals = { processed: 0, succeeded: 0, failed: 0, reclaimed: 0 };
  for (let i = 0; i < DRAIN_ROUNDS; i += 1) {
    if (Date.now() - started > WALL_MS) break;
    const result = await processAgentJobs({
      limit: limit ?? 8,
    });
    totals.processed += result.processed;
    totals.succeeded += result.succeeded;
    totals.failed += result.failed;
    totals.reclaimed += result.reclaimed;
    if (result.processed === 0) break;
  }
  return Response.json({ ...totals, erasures, elapsed_ms: Date.now() - started });
}

export async function GET(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;
  return processJobs();
}

export async function POST(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  let limit: number | undefined;
  try {
    const body = (await request.json()) as { limit?: number };
    limit = body.limit;
  } catch {
    limit = undefined;
  }

  return processJobs(limit);
}
