import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/supabase/database.types";

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/escalations/proof-gates", () => ({ checkProofGates: vi.fn() }));
vi.mock("@/lib/jobs/enqueue", () => ({ enqueueAgentJob: vi.fn() }));

import { runEscalatorJob } from "@/lib/agents/escalator/runner";
import { checkProofGates } from "@/lib/escalations/proof-gates";
import { enqueueAgentJob } from "@/lib/jobs/enqueue";
import { createAdminClient } from "@/lib/supabase/admin";

type AgentJobRow = Database["public"]["Tables"]["agent_jobs"]["Row"];

function job(payload: Record<string, unknown>): AgentJobRow {
  return {
    id: "job-1",
    case_id: "case-1",
    job_type: "escalator_suggest",
    payload_json: payload,
  } as unknown as AgentJobRow;
}

function mockCaseLevel(level: "L1" | "L2" | "L3" | "L4") {
  vi.mocked(createAdminClient).mockReturnValue({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: "case-1", escalation_level: level },
            error: null,
          }),
        })),
      })),
    })),
  } as never);
}

describe("runEscalatorJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(enqueueAgentJob).mockResolvedValue({
      enqueued: true,
      job_id: "draft-job",
    });
  });

  it("enqueues a proof-gated explicit target draft", async () => {
    mockCaseLevel("L1");
    vi.mocked(checkProofGates).mockResolvedValue({
      passed: true,
      targetLevel: "L2",
    });

    const result = await runEscalatorJob(
      job({ case_id: "case-1", target_level: "L2" }),
    );

    expect(checkProofGates).toHaveBeenCalledWith("case-1", "L2");
    expect(enqueueAgentJob).toHaveBeenCalledWith({
      case_id: "case-1",
      job_type: "draft_letter",
      agent_role: "DRAFTER",
      idempotency_key: "draft_letter:case-1:L2:proof-gate",
      payload: { case_id: "case-1", level: "L2", source_job_id: "job-1" },
    });
    expect(result.output).toEqual({
      can_escalate: true,
      target_level: "L2",
      proof_gate_passed: true,
      suggest_drafter: true,
    });
  });

  it("advances one level for a response timeout", async () => {
    mockCaseLevel("L2");
    vi.mocked(checkProofGates).mockResolvedValue({
      passed: true,
      targetLevel: "L3",
    });

    await runEscalatorJob(job({ reason: "response_timeout" }));

    expect(checkProofGates).toHaveBeenCalledWith("case-1", "L3");
  });

  it("does not enqueue when proof gates block", async () => {
    mockCaseLevel("L1");
    vi.mocked(checkProofGates).mockResolvedValue({
      passed: false,
      targetLevel: "L2",
      blockedReason: "Proof gate failed for L2: L1_send_proof",
      missingProof: ["L1_send_proof"],
    });

    const result = await runEscalatorJob(job({ target_level: "L2" }));

    expect(enqueueAgentJob).not.toHaveBeenCalled();
    expect(result.output).toEqual({
      can_escalate: false,
      target_level: "L2",
      blocked_reason: "Proof gate failed for L2: L1_send_proof",
      proof_gate_passed: false,
      suggest_drafter: false,
    });
  });

  it("never enqueues an unsupported L4 draft", async () => {
    mockCaseLevel("L4");
    vi.mocked(checkProofGates).mockResolvedValue({
      passed: true,
      targetLevel: "L4",
    });

    const result = await runEscalatorJob(job({ target_level: "L4" }));

    expect(enqueueAgentJob).not.toHaveBeenCalled();
    expect(result.output).toMatchObject({
      can_escalate: true,
      target_level: "L4",
      proof_gate_passed: true,
      suggest_drafter: false,
    });
  });
});
