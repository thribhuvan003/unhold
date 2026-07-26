import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { evaluateTransition } from '@/lib/state-machine/guards';
import type {
  CaseContext,
  CaseEscalation,
  CaseEvidence,
  ChecklistItem,
  TransitionEvent,
} from '@/lib/state-machine/types';
import type { Database, Json } from '@/supabase/database.types';
import { ApiError } from '@/lib/api/errors';

type ActorType = Database['public']['Enums']['actor_type'];

export interface ApplyTransitionInput {
  caseId: string;
  event: TransitionEvent;
  payload?: Record<string, unknown>;
  actorType: ActorType;
  actorId: string;
  requestId?: string;
}

export async function loadCaseContext(
  caseId: string,
  payload: Record<string, unknown> = {},
): Promise<CaseContext> {
  const admin = createAdminClient();

  const { data: caseRow, error: caseError } = await admin
    .from('cases')
    .select(
      'id, status, playbook_id, escalation_level, resolution_type, public_stats_opt_in, metadata_json',
    )
    .eq('id', caseId)
    .single();

  if (caseError || !caseRow) {
    throw new ApiError(404, 'not_found', 'Case not found');
  }

  const { data: evidence } = await admin
    .from('evidence')
    .select('id, evidence_type, sha256, sha256_verified_at, deleted_at')
    .eq('case_id', caseId);

  const { data: escalations } = await admin
    .from('escalations')
    .select('id, level, status, approved_at, sent_proof_evidence_id')
    .eq('case_id', caseId);

  let checklist: ChecklistItem[] = [];
  if (caseRow.playbook_id) {
    const { data: playbook } = await admin
      .from('playbooks')
      .select('checklist_json')
      .eq('id', caseRow.playbook_id)
      .maybeSingle();
    if (playbook?.checklist_json && Array.isArray(playbook.checklist_json)) {
      checklist = playbook.checklist_json as unknown as ChecklistItem[];
    }
  }

  return {
    case: {
      id: caseRow.id,
      status: caseRow.status,
      playbook_id: caseRow.playbook_id,
      escalation_level: caseRow.escalation_level,
      resolution_type: caseRow.resolution_type,
      public_stats_opt_in: caseRow.public_stats_opt_in,
      metadata_json: (caseRow.metadata_json as Record<string, unknown>) ?? {},
    },
    evidence: (evidence ?? []) as CaseEvidence[],
    escalations: (escalations ?? []) as CaseEscalation[],
    checklist,
    payload,
  };
}

export async function applyTransition(input: ApplyTransitionInput) {
  const payload = input.payload ?? {};
  const ctx = await loadCaseContext(input.caseId, payload);
  const evaluation = evaluateTransition(ctx, input.event);

  if (!evaluation.ok) {
    throw new ApiError(422, 'guard_failed', evaluation.message, { guard: evaluation.guard });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc('transition_case', {
    p_case_id: input.caseId,
    p_to_status: evaluation.to,
    p_trigger: input.event,
    p_actor_type: input.actorType,
    p_actor_id: input.actorId,
    p_payload_json: payload as Json,
  });

  if (error) {
    const message = error.message ?? 'Transition failed';
    if (message.includes('guard_failed')) {
      const guardMatch = message.match(/guard_failed[:\s]+(\w+)/);
      throw new ApiError(422, 'guard_failed', message, {
        guard: guardMatch?.[1] ?? 'valid_transition',
      });
    }
    if (message.includes('invalid_transition')) {
      throw new ApiError(422, 'guard_failed', message, { guard: 'valid_transition' });
    }
    throw error;
  }

  await appendActionLog({
    caseId: input.caseId,
    actorType: input.actorType,
    actorId: input.actorId,
    action: `transition.request.${input.event}`,
    payload: { from: ctx.case.status, to: evaluation.to, event: input.event, ...payload },
    requestId: input.requestId,
  });

  return data;
}

export async function tryAutoTransitionOnEvidence(caseId: string, actorType: ActorType, actorId: string) {
  const ctx = await loadCaseContext(caseId);
  if (ctx.case.status !== 'new') return null;
  return applyTransition({
    caseId,
    event: 'evidence.submitted',
    actorType,
    actorId,
  });
}