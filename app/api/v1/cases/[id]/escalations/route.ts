import { enqueueAgentJob } from '@/lib/jobs/enqueue';
import { createClient } from '@/lib/supabase/server';

const VALID_LEVELS = new Set(['L1', 'L2', 'L3']);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('escalations')
    .select('*')
    .eq('case_id', caseId)
    .order('level', { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ escalations: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await context.params;

  let body: { level?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  const level = body.level ?? 'L1';
  if (!VALID_LEVELS.has(level)) {
    return Response.json({ error: 'invalid_level' }, { status: 400 });
  }

  const result = await enqueueAgentJob({
    case_id: caseId,
    job_type: 'draft_letter',
    agent_role: 'DRAFTER',
    idempotency_key: `draft_letter:${caseId}:${level}:${Date.now()}`,
    payload: { case_id: caseId, level },
  });

  return Response.json(result, { status: result.enqueued ? 201 : 200 });
}