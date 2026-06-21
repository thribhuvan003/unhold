import type { RoutePlan } from '@/lib/agents/router';

export type TickTrigger =
  | { type: 'cron' }
  | { type: 'evidence_confirm'; evidence_id: string }
  | { type: 'transition'; event: string }
  | { type: 'mark_sent'; escalation_id: string }
  | { type: 'human_gate_cleared'; gate_id: string }
  | { type: 'user_resume' };

export type CaseTickResult =
  | {
      exit: 'skipped';
      reason: 'concurrent_tick' | 'not_due' | 'terminal' | 'paused' | 'human_gate';
    }
  | {
      exit: 'completed';
      tick_id: string;
      case_id: string;
      jobs_enqueued: string[];
      next_check_at: string;
      route_plan: RoutePlan;
    };