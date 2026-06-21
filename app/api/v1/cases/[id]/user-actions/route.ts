import { createUserAction } from '@/lib/user-actions/create';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/supabase/database.types';

type UserActionType = Database['public']['Enums']['user_action_type'];

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await context.params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('user_actions')
    .select('*')
    .eq('case_id', caseId)
    .order('priority', { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ actions: data ?? [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await context.params;

  let body: {
    action_type: UserActionType;
    title: string;
    description?: string;
    priority?: number;
    due_at?: string;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.action_type || !body.title) {
    return Response.json({ error: 'missing_required_fields' }, { status: 400 });
  }

  const actionId = await createUserAction({
    case_id: caseId,
    action_type: body.action_type,
    title: body.title,
    description: body.description,
    priority: body.priority,
    due_at: body.due_at,
  });

  return Response.json({ id: actionId }, { status: 201 });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: caseId } = await context.params;
  const supabase = await createClient();

  let body: { action_id: string; completed?: boolean; dismissed?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.action_id) {
    return Response.json({ error: 'missing_action_id' }, { status: 400 });
  }

  const update: Database['public']['Tables']['user_actions']['Update'] = {};
  if (body.completed) update.completed_at = new Date().toISOString();
  if (body.dismissed) update.dismissed_at = new Date().toISOString();

  const { error } = await supabase
    .from('user_actions')
    .update(update)
    .eq('id', body.action_id)
    .eq('case_id', caseId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}