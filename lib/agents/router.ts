import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { TickTrigger } from '@/lib/loops/tick-types';
import type { Database } from '@/supabase/database.types';

type CaseRow = Database['public']['Tables']['cases']['Row'];
type AgentRole = Database['public']['Enums']['agent_role'];
type CaseStatus = Database['public']['Enums']['case_status'];

export type JobSpawnSpec = {
  job_type: string;
  agent_role: AgentRole;
  enqueue: boolean;
  idempotency_key?: string;
  idempotency_bucket?: string;
  scheduled_at?: string;
  payload?: Record<string, unknown>;
  reason: string;
};

export type RoutePlan = {
  case_id: string;
  case_status: CaseStatus;
  jobs: JobSpawnSpec[];
  blocked_reason?: string;
  parallel_safe: string[];
  sequential_chain?: string[];
};

const COST_CAP_USD = 2.0;

function intakeHash(caseRow: CaseRow): string {
  const raw = JSON.stringify(caseRow.intake_json ?? {});
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16);
}

/**
 * LEAD ROUTER — non-LLM orchestrator.
 * Maps case status + trigger → agent_jobs spawn plan.
 * @see docs/BUILD_SPEC_LOOPS.md §3, §11.3
 */
export async function routeCaseJobs(caseRow: CaseRow, trigger: TickTrigger): Promise<RoutePlan> {
  const plan: RoutePlan = {
    case_id: caseRow.id,
    case_status: caseRow.status,
    jobs: [],
    parallel_safe: [],
  };

  if (caseRow.agent_cost_usd >= (caseRow.agent_cost_cap_usd ?? COST_CAP_USD)) {
    plan.blocked_reason = 'cost_cap';
    plan.jobs.push({
      job_type: 'human_gate_cost_cap',
      agent_role: 'HUMAN_OPS',
      enqueue: false,
      reason: 'agent_cost_usd >= cap; ops queue only',
    });
    return plan;
  }

  const status = caseRow.status;

  if (trigger.type === 'evidence_confirm') {
    plan.jobs.push({
      job_type: 'verifier_extract',
      agent_role: 'VERIFIER',
      enqueue: true,
      idempotency_key: `verifier:${trigger.evidence_id}:confirm`,
      payload: { case_id: caseRow.id, evidence_id: trigger.evidence_id },
      reason: 'evidence confirmed — run VERIFIER',
    });
    plan.parallel_safe.push('verifier');
    return plan;
  }

  switch (status) {
    case 'new':
    case 'intake_scoping':
      plan.jobs.push({
        job_type: 'intake_classify',
        agent_role: 'INTAKE',
        enqueue: true,
        idempotency_key: `intake_classify:${caseRow.id}:${intakeHash(caseRow)}`,
        payload: { case_id: caseRow.id },
        reason: 'classify freeze + assign playbook',
      });
      plan.parallel_safe.push('intake');
      break;

    case 'monitoring':
      plan.jobs.push({
        job_type: 'monitor_tick',
        agent_role: 'MONITOR',
        enqueue: true,
        payload: { case_id: caseRow.id, case_status: status, trigger },
        reason: 'periodic reminders + user actions',
      });
      plan.parallel_safe.push('monitor');
      break;

    case 'evidence_building':
      plan.jobs.push(
        {
          job_type: 'monitor_tick',
          agent_role: 'MONITOR',
          enqueue: true,
          payload: { case_id: caseRow.id, case_status: status, trigger },
          reason: 'checklist nudges',
        },
        {
          job_type: 'evidence_bundle',
          agent_role: 'EVIDENCE',
          enqueue: true,
          idempotency_key: `evidence_bundle:${caseRow.id}:latest`,
          payload: { case_id: caseRow.id },
          reason: 'compile SHA-256 manifest when checklist complete',
        },
      );
      plan.parallel_safe.push('monitor', 'evidence');
      break;

    case 'escalation': {
      const level = caseRow.escalation_level;
      plan.jobs.push({
        job_type: 'escalator_suggest',
        agent_role: 'ESCALATOR',
        enqueue: true,
        idempotency_key: `escalator:${caseRow.id}:${level}:unlock`,
        payload: { case_id: caseRow.id, target_level: level },
        reason: 'verify proof gates before drafter',
      });
      plan.sequential_chain = ['escalator', 'drafter'];
      break;
    }

    case 'awaiting_response':
      plan.jobs.push({
        job_type: 'monitor_tick',
        agent_role: 'MONITOR',
        enqueue: true,
        payload: {
          case_id: caseRow.id,
          case_status: status,
          escalation_response_due_at: await getResponseDueAt(caseRow.id),
          trigger,
        },
        reason: 'follow-up reminder; escalator may prepare a user-reviewed option',
      });
      plan.parallel_safe.push('monitor');

      if (await isEscalationOverdue(caseRow.id)) {
        plan.jobs.push({
          job_type: 'escalator_suggest',
          agent_role: 'ESCALATOR',
          enqueue: true,
          idempotency_key: `escalator:${caseRow.id}:timeout:${new Date().toISOString().slice(0, 10)}`,
          payload: { case_id: caseRow.id, reason: 'response_timeout' },
          reason: 'recorded follow-up date passed — prepare a user-reviewed option',
        });
        plan.sequential_chain = ['escalator', 'drafter'];
      }
      break;

    case 'verified':
    case 'retried':
      plan.jobs.push({
        job_type: 'monitor_tick',
        agent_role: 'MONITOR',
        enqueue: true,
        payload: { case_id: caseRow.id, case_status: status, trigger },
        reason: 'resolution confirmation nudges',
      });
      break;

    case 'stalled':
      plan.jobs.push({
        job_type: 'monitor_tick',
        agent_role: 'MONITOR',
        enqueue: true,
        payload: { case_id: caseRow.id, case_status: status, trigger },
        reason: 'low-frequency stall watch',
      });
      break;

    case 'human_escalation':
      plan.blocked_reason = 'human_escalation';
      plan.jobs.push({
        job_type: 'monitor_tick',
        agent_role: 'MONITOR',
        enqueue: false,
        reason: 'automation paused — ops queue',
      });
      break;

    default:
      plan.blocked_reason = `no_route_for_status:${status}`;
  }

  return plan;
}

export type ModelId =
  | 'minimaxai/minimax-m3'
  | 'RULE_ENGINE'
  | 'HUMAN_OPS';

const DEFAULT_LLM_MODEL = 'minimaxai/minimax-m3';

export function routeModel(
  agentRole: AgentRole,
  ctx: { agent_cost_usd: number; level?: string; evidence_count?: number },
): ModelId {
  if (ctx.agent_cost_usd >= COST_CAP_USD) return 'HUMAN_OPS';
  if (agentRole === 'INTAKE' && (ctx.evidence_count ?? 0) === 0) {
    return 'RULE_ENGINE';
  }
  return DEFAULT_LLM_MODEL;
}

async function getResponseDueAt(caseId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('escalations')
    .select('response_due_at')
    .eq('case_id', caseId)
    .eq('status', 'sent')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.response_due_at ?? null;
}

async function isEscalationOverdue(caseId: string): Promise<boolean> {
  const due = await getResponseDueAt(caseId);
  if (!due) return false;
  return new Date(due) <= new Date();
}
