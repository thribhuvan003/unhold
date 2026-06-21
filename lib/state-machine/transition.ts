import 'server-only';

import { ApiError } from '@/lib/api/errors';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type CaseStatus = Database['public']['Enums']['case_status'];
type ActorType = Database['public']['Enums']['actor_type'];

export type TransitionInput = {
  caseId: string;
  toStatus: CaseStatus;
  trigger: string;
  actorType?: ActorType;
  actorId?: string;
  payload?: Record<string, unknown>;
};

export async function transitionCase(input: TransitionInput) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('transition_case', {
    p_case_id: input.caseId,
    p_to_status: input.toStatus,
    p_trigger: input.trigger,
    p_actor_type: input.actorType ?? 'user',
    p_actor_id: input.actorId,
    p_payload_json: (input.payload ?? {}) as Json,
  });

  if (error) {
    const message = error.message ?? 'transition_failed';
    if (message.includes('guard_failed')) {
      const guardMatch = message.match(/guard_failed:\s*(\w+)/);
      const hintGuard =
        typeof error.hint === 'string' && error.hint.includes('has_prior_level_proof')
          ? 'has_prior_level_proof'
          : guardMatch?.[1];
      throw new ApiError(422, 'guard_failed', message, { guard: hintGuard ?? 'guard_failed' });
    }
    if (message.includes('invalid_transition')) {
      throw new ApiError(422, 'guard_failed', message, { guard: 'invalid_transition' });
    }
    throw new ApiError(500, 'internal_error', message);
  }

  return data;
}