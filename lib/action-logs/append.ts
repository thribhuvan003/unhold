import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type ActorType = Database['public']['Enums']['actor_type'];

export interface AppendActionLogInput {
  caseId: string;
  actorType: ActorType;
  actorId: string;
  action: string;
  payload?: Record<string, unknown>;
  requestId?: string;
  ipHash?: string;
}

export async function appendActionLog(input: AppendActionLogInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('action_logs').insert({
    case_id: input.caseId,
    actor_type: input.actorType,
    actor_id: input.actorId,
    action: input.action,
    payload_json: (input.payload ?? {}) as Json,
    request_id: input.requestId ?? null,
    ip_hash: input.ipHash ?? null,
  });

  if (error) {
    throw error;
  }
}