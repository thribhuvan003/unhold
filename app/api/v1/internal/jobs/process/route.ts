import { assertCronAuth } from '@/lib/api/cron-auth';
import { processAgentJobs } from '@/lib/jobs/process';

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

  const result = await processAgentJobs({ limit });
  return Response.json(result);
}