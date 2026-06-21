import 'server-only';

import { runCaseTick } from '@/lib/loops/case-tick';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/supabase/database.types';

type HumanGateStatus = Database['public']['Enums']['human_gate_status'];

export type EnqueueHumanGateInput = {
  case_id: string;
  queue_reason: string;
  priority?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Insert pending human_gate_queue row — never auto-resolves cases.
 */
export async function enqueueHumanGate(input: EnqueueHumanGateInput): Promise<string> {
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from('human_gate_queue')
    .select('id')
    .eq('case_id', input.case_id)
    .eq('queue_reason', input.queue_reason)
    .eq('status', 'pending')
    .maybeSingle();

  if (existing?.id) {
    return existing.id;
  }

  const { data, error } = await supabase
    .from('human_gate_queue')
    .insert({
      case_id: input.case_id,
      queue_reason: input.queue_reason,
      priority: input.priority ?? 0,
      status: 'pending',
      metadata_json: input.metadata ?? {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`enqueue_human_gate_failed: ${error?.message ?? 'unknown'}`);
  }

  await appendSwarmEvent({
    case_id: input.case_id,
    agent_role: 'HUMAN_OPS',
    event_type: 'human_gate_enqueued',
    severity: 'human_required',
    message: `Human review required: ${input.queue_reason}`,
    automated: false,
    metadata: { gate_id: data.id, priority: input.priority ?? 0 },
  });

  return data.id;
}

export type ResolveHumanGateInput = {
  gate_id: string;
  operator_id: string;
  resolution_notes?: string;
  status?: Extract<HumanGateStatus, 'resolved' | 'dismissed'>;
};

/**
 * Operator resolves a gate — resumes inner loop via runCaseTick.
 * HUMAN_OPS never auto-resolves without explicit operator action.
 */
export async function resolveHumanGate(input: ResolveHumanGateInput): Promise<void> {
  const supabase = createAdminClient();
  const status = input.status ?? 'resolved';
  const now = new Date().toISOString();

  const { data: gate, error: loadError } = await supabase
    .from('human_gate_queue')
    .select('*')
    .eq('id', input.gate_id)
    .maybeSingle();

  if (loadError || !gate) {
    throw new Error(`human_gate_not_found: ${input.gate_id}`);
  }

  if (gate.status !== 'pending' && gate.status !== 'assigned') {
    throw new Error(`human_gate_not_open: ${gate.status}`);
  }

  const { error: updateError } = await supabase
    .from('human_gate_queue')
    .update({
      status,
      resolved_at: now,
      resolved_by: input.operator_id,
      resolution_notes: input.resolution_notes ?? null,
    })
    .eq('id', input.gate_id);

  if (updateError) {
    throw new Error(`resolve_human_gate_failed: ${updateError.message}`);
  }

  await supabase.from('action_logs').insert({
    case_id: gate.case_id,
    actor_type: 'operator',
    actor_id: input.operator_id,
    action: 'human_gate.resolved',
    payload_json: {
      gate_id: input.gate_id,
      queue_reason: gate.queue_reason,
      status,
      notes: input.resolution_notes ?? null,
    },
  });

  await appendSwarmEvent({
    case_id: gate.case_id,
    agent_role: 'HUMAN_OPS',
    event_type: 'human_gate_resolved',
    severity: 'info',
    message: `Human gate ${status}: ${gate.queue_reason}`,
    automated: false,
    metadata: { gate_id: input.gate_id, operator_id: input.operator_id },
  });

  await runCaseTick(gate.case_id, { type: 'human_gate_cleared', gate_id: input.gate_id });
}

export async function listPendingHumanGates(options?: {
  limit?: number;
  status?: HumanGateStatus[];
}) {
  const supabase = createAdminClient();
  const statuses = options?.status ?? ['pending', 'assigned'];

  const { data, error } = await supabase
    .from('human_gate_queue')
    .select(
      `
      id,
      case_id,
      queue_reason,
      priority,
      status,
      assigned_to,
      created_at,
      cases!inner (
        public_id,
        status,
        escalation_level,
        bank_id,
        created_at
      )
    `,
    )
    .in('status', statuses)
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(options?.limit ?? 50);

  if (error) {
    throw new Error(`list_human_gates_failed: ${error.message}`);
  }

  return data ?? [];
}