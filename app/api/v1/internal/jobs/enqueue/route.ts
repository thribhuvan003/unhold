import { assertCronAuth } from '@/lib/api/cron-auth';
import { enqueueAgentJob, type EnqueueInput } from '@/lib/jobs/enqueue';

export async function POST(request: Request) {
  const authError = assertCronAuth(request);
  if (authError) return authError;

  let body: EnqueueInput;
  try {
    body = (await request.json()) as EnqueueInput;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.case_id || !body.job_type || !body.agent_role || !body.idempotency_key) {
    return Response.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const result = await enqueueAgentJob(body);
  return Response.json(result, { status: result.enqueued ? 201 : 200 });
}