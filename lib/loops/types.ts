/**
 * Product loop shared types — re-exported from case-tick for clean imports.
 * @see docs/BUILD_SPEC_LOOPS.md §2
 */

export type { TickTrigger, CaseTickResult } from '@/lib/loops/tick-types';

export type { RoutePlan, JobSpawnSpec } from '@/lib/agents/router';

export type {
  HarnessState,
  HarnessAgentRole,
  HarnessManifest,
  ReviewRound,
  VerificationResult,
  RouteDecision,
} from '@/lib/loops/agent-harness';