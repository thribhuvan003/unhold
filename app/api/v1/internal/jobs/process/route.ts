import { assertCronAuth } from '@/lib/api/cron-auth';
import { processAgentJobs } from '@/lib/jobs/process';
import { runErasureBatch } from '@/lib/data-rights/erasure';

async function processJobs(limit?: number) {
  const erasures = await runErasureBatch();
  const result = await processAgentJobs({ limit });
  return Response.json({ ...result, erasures });
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
