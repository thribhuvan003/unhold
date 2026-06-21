import 'server-only';

import { MISSING_DOC_LABELS } from '@/lib/agents/intake/rules';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/supabase/database.types';

type UserActionType = Database['public']['Enums']['user_action_type'];

type UserActionInsert = Database['public']['Tables']['user_actions']['Insert'] & {
  escalation_id?: string | null;
  evidence_id?: string | null;
  metadata_json?: Database['public']['Tables']['user_actions']['Row']['metadata_json'];
};

export type CreateUserActionInput = {
  case_id: string;
  action_type: UserActionType;
  title: string;
  description?: string;
  priority?: number;
  due_at?: string;
  escalation_id?: string;
  evidence_id?: string;
  metadata?: Record<string, unknown>;
};

export async function createUserAction(input: CreateUserActionInput): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('user_actions')
    .select('id')
    .eq('case_id', input.case_id)
    .eq('action_type', input.action_type)
    .is('completed_at', null)
    .is('dismissed_at', null)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('user_actions')
    .insert({
      case_id: input.case_id,
      action_type: input.action_type,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 50,
      due_at: input.due_at ?? null,
      escalation_id: input.escalation_id ?? null,
      evidence_id: input.evidence_id ?? null,
      metadata_json: (input.metadata ?? {}) as UserActionInsert['metadata_json'],
    } satisfies UserActionInsert)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`create_user_action_failed: ${error?.message ?? 'unknown'}`);
  }

  type CasePatch = Database['public']['Tables']['cases']['Update'] & {
    user_action_required?: boolean;
    next_user_action_type?: UserActionType | null;
    next_user_action_due_at?: string | null;
    last_activity_at?: string;
  };

  await supabase
    .from('cases')
    .update({
      user_action_required: true,
      next_user_action_type: input.action_type,
      next_user_action_due_at: input.due_at ?? null,
      last_activity_at: new Date().toISOString(),
    } as unknown as Database['public']['Tables']['cases']['Update'])
    .eq('id', input.case_id);

  return data.id;
}

const DOC_PRIORITY: Record<string, number> = {
  ncrp_ack: 90,
  bank_sms: 85,
  court_order_doc: 95,
  id_proof: 70,
};

/**
 * Create checklist user_actions from intake missing_documents slugs.
 */
export async function createUserActionsFromIntake(
  caseId: string,
  missingDocuments: string[],
): Promise<string[]> {
  const ids: string[] = [];

  for (const slug of missingDocuments) {
    const label = MISSING_DOC_LABELS[slug];
    if (!label) continue;

    const id = await createUserAction({
      case_id: caseId,
      action_type: 'upload_evidence',
      title: label.title,
      description: `Required document: ${slug}`,
      priority: DOC_PRIORITY[slug] ?? 60,
      metadata: { checklist_slug: slug, evidence_type: label.evidence_type },
    });
    ids.push(id);
  }

  return ids;
}

/**
 * Create a user_action from monitor tick suggestion.
 */
export async function createUserActionFromMonitor(input: {
  case_id: string;
  action_code: string;
  action_title: string;
  priority?: number;
}): Promise<string> {
  const actionTypeMap: Record<string, UserActionType> = {
    upload_evidence: 'upload_evidence',
    complete_checklist: 'complete_checklist',
    review_letter: 'review_letter',
    respond_monitoring: 'respond_monitoring',
  };

  const action_type = actionTypeMap[input.action_code] ?? 'respond_monitoring';

  return createUserAction({
    case_id: input.case_id,
    action_type,
    title: input.action_title,
    priority: input.priority ?? 55,
    metadata: { source: 'monitor_tick', action_code: input.action_code },
  });
}