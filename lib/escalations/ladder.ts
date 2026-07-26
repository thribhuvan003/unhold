import type { Database } from '@/supabase/database.types';

export type EscalationLevel = Database['public']['Enums']['escalation_level'];
export type EscalationChannel = Database['public']['Enums']['escalation_channel'];

export type LadderStep = {
  level: EscalationLevel;
  channel: EscalationChannel;
  waitDays: number;
  /** Prior level whose send_proof must exist before drafting/sending this level */
  requiredProofLevel: EscalationLevel | null;
  /** Consent type required before mark-sent (L3) */
  requiredConsent: Database['public']['Enums']['consent_type'] | null;
};

/**
 * Canonical escalation ladder per BUILD_SPEC §4.3.
 * L1→L3 product path; L4 RTI reserved for Phase 2+.
 */
export const ESCALATION_LADDER: Record<EscalationLevel, LadderStep> = {
  L1: {
    level: 'L1',
    channel: 'branch_manager',
    waitDays: 7,
    requiredProofLevel: null,
    requiredConsent: null,
  },
  L2: {
    level: 'L2',
    channel: 'nodal_officer',
    waitDays: 10,
    requiredProofLevel: 'L1',
    requiredConsent: null,
  },
  L3: {
    level: 'L3',
    channel: 'rbi_cms',
    waitDays: 90,
    requiredProofLevel: 'L2',
    requiredConsent: 'escalation_send',
  },
  L4: {
    level: 'L4',
    channel: 'rti',
    waitDays: 30,
    requiredProofLevel: 'L3',
    requiredConsent: null,
  },
};

export function getLadderStep(level: EscalationLevel): LadderStep {
  return ESCALATION_LADDER[level];
}

export function getPriorLevel(level: EscalationLevel): EscalationLevel | null {
  const order: EscalationLevel[] = ['L1', 'L2', 'L3', 'L4'];
  const idx = order.indexOf(level);
  return idx > 0 ? order[idx - 1]! : null;
}

export function computeResponseDueAt(sentAt: Date, level: EscalationLevel): Date {
  const step = getLadderStep(level);
  const due = new Date(sentAt);
  due.setUTCDate(due.getUTCDate() + step.waitDays);
  return due;
}