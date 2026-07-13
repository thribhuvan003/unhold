import "server-only";

import {
  EscalatorSuggestionOutputSchema,
  type EscalatorSuggestionOutput,
} from "@/lib/agents/schemas";
import type { AgentRunResult } from "@/lib/agents/runner";
import { checkProofGates } from "@/lib/escalations/proof-gates";
import { enqueueAgentJob } from "@/lib/jobs/enqueue";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/supabase/database.types";

type AgentJobRow = Database["public"]["Tables"]["agent_jobs"]["Row"];
type EscalationLevel = Database["public"]["Enums"]["escalation_level"];

const LEVELS: EscalationLevel[] = ["L1", "L2", "L3", "L4"];
const NEXT_LEVEL: Record<EscalationLevel, EscalationLevel | null> = {
  L1: "L2",
  L2: "L3",
  L3: "L4",
  L4: null,
};

function isEscalationLevel(value: unknown): value is EscalationLevel {
  return typeof value === "string" && LEVELS.includes(value as EscalationLevel);
}

function payloadRecord(payload: Json): Record<string, unknown> {
  return payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>)
    : {};
}

/**
 * ESCALATOR agent — suggests and queues a draft only after server-side proof gates pass.
 * It never sends a letter or changes case state.
 */
export async function runEscalatorJob(
  job: AgentJobRow,
): Promise<AgentRunResult> {
  const supabase = createAdminClient();
  const { data: caseRow, error } = await supabase
    .from("cases")
    .select("id, escalation_level")
    .eq("id", job.case_id)
    .single();

  if (error || !caseRow) {
    throw new Error(`escalator_case_not_found: ${job.case_id}`);
  }

  const payload = payloadRecord(job.payload_json);
  let targetLevel = isEscalationLevel(payload.target_level)
    ? payload.target_level
    : null;

  if (!targetLevel && payload.reason === "response_timeout") {
    targetLevel = NEXT_LEVEL[caseRow.escalation_level];
  }

  if (!targetLevel) {
    const output: EscalatorSuggestionOutput = {
      can_escalate: false,
      blocked_reason:
        caseRow.escalation_level === "L4"
          ? "No escalation level is available after L4."
          : "A valid target level or response-timeout reason is required.",
      proof_gate_passed: false,
      suggest_drafter: false,
    };
    EscalatorSuggestionOutputSchema.parse(output);
    return {
      output: output as unknown as Record<string, unknown>,
      cost_usd: 0,
    };
  }

  const gate = await checkProofGates(job.case_id, targetLevel);
  const draftSupported = targetLevel !== "L4";

  if (gate.passed && draftSupported) {
    await enqueueAgentJob({
      case_id: job.case_id,
      job_type: "draft_letter",
      agent_role: "DRAFTER",
      idempotency_key: `draft_letter:${job.case_id}:${targetLevel}:proof-gate`,
      payload: {
        case_id: job.case_id,
        level: targetLevel,
        source_job_id: job.id,
      },
    });
  }

  const output: EscalatorSuggestionOutput = {
    can_escalate: gate.passed,
    target_level: targetLevel,
    ...(gate.blockedReason ? { blocked_reason: gate.blockedReason } : {}),
    proof_gate_passed: gate.passed,
    suggest_drafter: gate.passed && draftSupported,
  };
  EscalatorSuggestionOutputSchema.parse(output);

  return { output: output as unknown as Record<string, unknown>, cost_usd: 0 };
}
