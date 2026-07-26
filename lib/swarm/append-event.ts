import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';

type AgentRole = Database['public']['Enums']['agent_role'];

export type SwarmEventInput = {
  case_id: string;
  agent_role: AgentRole;
  event_type: string;
  severity?: 'info' | 'warn' | 'error' | 'human_required';
  message: string;
  automated?: boolean;
  job_id?: string | null;
  metadata?: Record<string, unknown>;
};

export async function appendSwarmEvent(input: SwarmEventInput): Promise<string> {
  const supabase = createAdminClient();
  const row: Database['public']['Tables']['swarm_events']['Insert'] & {
    metadata_json?: Json;
    job_id?: string | null;
  } = {
    case_id: input.case_id,
    agent_role: input.agent_role,
    event_type: input.event_type,
    severity: input.severity ?? 'info',
    message: input.message,
    automated: input.automated ?? true,
    metadata_json: (input.metadata ?? {}) as Json,
    job_id: input.job_id ?? null,
  };

  const { data, error } = await supabase.from('swarm_events').insert(row)
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`append_swarm_event_failed: ${error?.message ?? 'unknown'}`);
  }
  return data.id;
}