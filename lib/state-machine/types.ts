import type { Database } from '@/supabase/database.types';

export type CaseStatus = Database['public']['Enums']['case_status'];

export const CASE_STATUSES = [
  'new',
  'intake_scoping',
  'monitoring',
  'evidence_building',
  'escalation',
  'awaiting_response',
  'verified',
  'resolved',
  'stalled',
  'retried',
  'human_escalation',
  'closed',
  'public_pressure',
] as const satisfies readonly CaseStatus[];

export type TransitionEvent =
  | 'evidence.submitted'
  | 'intake.classified'
  | 'checklist.complete'
  | 'user.abandon'
  | 'inactive_30d'
  | 'bundle.ready'
  | 'user.mark_sent'
  | 'response.received'
  | 'user.confirm_unfreeze'
  | 'response.timeout'
  | 'inactive_45d'
  | 'resolution.confirmed'
  | 'user.opt_in_stats'
  | 'bundle.delivered'
  | 'user.reopen'
  | 'new.strategy'
  | 'low_confidence'
  | 'cost_cap'
  | 'user.request'
  | 'ops.handoff';

export type GuardName =
  | 'has_min_evidence'
  | 'playbook_assigned'
  | 'checklist_complete'
  | 'bundle_sha256'
  | 'proof_and_user_approved'
  | 'has_prior_level_proof'
  | 'level_below_l4'
  | 'unfreeze_confirmed'
  | 'resolution_type_set'
  | 'public_stats_consent'
  | 'valid_transition';

export interface TransitionRule {
  from: CaseStatus;
  event: TransitionEvent;
  to: CaseStatus;
  guard: GuardName;
}

export interface CaseEvidence {
  id: string;
  evidence_type: Database['public']['Enums']['evidence_type'];
  sha256: string;
  sha256_verified_at: string | null;
  deleted_at: string | null;
}

export interface CaseEscalation {
  id: string;
  level: Database['public']['Enums']['escalation_level'];
  status: Database['public']['Enums']['escalation_status'];
  approved_at: string | null;
  sent_proof_evidence_id: string | null;
}

export interface ChecklistItem {
  evidence_type: Database['public']['Enums']['evidence_type'];
  optional?: boolean;
}

export interface CaseContext {
  case: {
    id: string;
    status: CaseStatus;
    playbook_id: string | null;
    escalation_level: Database['public']['Enums']['escalation_level'];
    resolution_type: Database['public']['Enums']['resolution_type'] | null;
    public_stats_opt_in: boolean;
    metadata_json: Record<string, unknown>;
  };
  evidence: CaseEvidence[];
  escalations: CaseEscalation[];
  checklist: ChecklistItem[];
  payload: Record<string, unknown>;
}

export interface GuardResult {
  ok: boolean;
  guard?: GuardName;
  message?: string;
}

export interface TransitionResult {
  ok: boolean;
  from: CaseStatus;
  to?: CaseStatus;
  guard?: GuardName;
  message?: string;
}