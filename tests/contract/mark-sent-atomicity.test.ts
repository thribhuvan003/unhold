import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ApiError } from "@/lib/api/errors";
import { resetRateLimitMemory } from "@/lib/ratelimit";

const callOrder: string[] = [];

const mocks = vi.hoisted(() => ({
  requireRequestAuth: vi.fn(),
  assertCaseAccess: vi.fn(),
  checkProofGates: vi.fn(),
  assertProofGate: vi.fn(),
  transitionCase: vi.fn(),
  runCaseTick: vi.fn(),
  createAdminClient: vi.fn(),
  escalationUpdate: vi.fn(),
  escalationSelect: vi.fn(),
  evidenceSelect: vi.fn(),
  actionInsert: vi.fn(),
}));

vi.mock("@/lib/api/case-access", () => ({
  requireRequestAuth: mocks.requireRequestAuth,
  assertCaseAccess: mocks.assertCaseAccess,
}));
vi.mock("@/lib/escalations/proof-gates", () => ({
  checkProofGates: mocks.checkProofGates,
  assertProofGate: mocks.assertProofGate,
}));
vi.mock("@/lib/state-machine/transition", () => ({
  transitionCase: (...args: unknown[]) => mocks.transitionCase(...args),
}));
vi.mock("@/lib/loops/case-tick", () => ({
  runCaseTick: (...args: unknown[]) => mocks.runCaseTick(...args),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

import { POST as markSent } from "@/app/api/v1/cases/[id]/escalations/[eid]/mark-sent/route";

const caseId = "22222222-2222-4222-8222-222222222222";
const escalationId = "44444444-4444-4444-8444-444444444444";
const proofId = "550e8400-e29b-41d4-a716-446655440001";
const auth = {
  userId: "user-1",
  guestSessionId: null,
  actorType: "user" as const,
  actorId: "user-1",
};

function markSentRequest(body: Record<string, unknown> = {}) {
  return new NextRequest(
    `http://localhost/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440099",
      },
      body: JSON.stringify({
        proof_evidence_id: proofId,
        ...body,
      }),
    },
  );
}

function wireAdmin(escalation: Record<string, unknown>) {
  mocks.escalationSelect.mockResolvedValue({ data: escalation, error: null });
  mocks.evidenceSelect.mockResolvedValue({
    data: {
      id: proofId,
      evidence_type: "letter_sent_proof",
      case_id: caseId,
      deleted_at: null,
    },
    error: null,
  });
  mocks.actionInsert.mockResolvedValue({ error: null });
  mocks.escalationUpdate.mockImplementation(() => {
    callOrder.push("escalation_update");
    return {
      eq: () => ({
        eq: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  ...escalation,
                  status: "sent",
                  sent_at: "2026-07-25T12:00:00.000Z",
                  sent_proof_evidence_id: proofId,
                  response_due_at: "2026-08-01T12:00:00.000Z",
                },
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
  });

  mocks.createAdminClient.mockReturnValue({
    from: (table: string) => {
      if (table === "escalations") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => mocks.escalationSelect(),
              }),
            }),
          }),
          update: (payload: unknown) => {
            void payload;
            return mocks.escalationUpdate();
          },
        };
      }
      if (table === "evidence") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () => mocks.evidenceSelect(),
              }),
            }),
          }),
        };
      }
      if (table === "action_logs") {
        return {
          insert: (row: unknown) => {
            callOrder.push("action_log");
            return mocks.actionInsert(row);
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  });
}

describe("mark-sent atomicity (prod QA blocker regression)", () => {
  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
    resetRateLimitMemory();
    mocks.requireRequestAuth.mockResolvedValue(auth);
    mocks.assertCaseAccess.mockResolvedValue(undefined);
    mocks.checkProofGates.mockResolvedValue({ passed: true, missing: [] });
    mocks.assertProofGate.mockImplementation(() => undefined);
    mocks.runCaseTick.mockResolvedValue(undefined);
    mocks.transitionCase.mockImplementation(async () => {
      callOrder.push("transition");
      return { id: caseId, status: "awaiting_response" };
    });
  });

  it("calls transitionCase before writing escalation.status=sent", async () => {
    wireAdmin({
      id: escalationId,
      case_id: caseId,
      level: "L1",
      status: "approved",
      sent_at: null,
      sent_proof_evidence_id: null,
      response_due_at: null,
    });

    const response = await markSent(markSentRequest(), {
      params: Promise.resolve({ id: caseId, eid: escalationId }),
    });

    expect(response.status).toBe(200);
    expect(mocks.transitionCase).toHaveBeenCalledWith(
      expect.objectContaining({
        caseId,
        toStatus: "awaiting_response",
        trigger: "user.mark_sent",
        payload: expect.objectContaining({
          escalation_level: "L1",
          proof_evidence_id: proofId,
        }),
      }),
    );
    expect(callOrder.indexOf("transition")).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf("escalation_update")).toBeGreaterThan(
      callOrder.indexOf("transition"),
    );
  });

  it("does not write escalation.sent when transitionCase fails", async () => {
    wireAdmin({
      id: escalationId,
      case_id: caseId,
      level: "L1",
      status: "approved",
      sent_at: null,
      sent_proof_evidence_id: null,
      response_due_at: null,
    });
    mocks.transitionCase.mockImplementation(async () => {
      callOrder.push("transition");
      throw new ApiError(
        422,
        "guard_failed",
        "invalid_transition: intake_scoping -> awaiting_response via user.mark_sent",
        { guard: "invalid_transition" },
      );
    });

    const response = await markSent(markSentRequest(), {
      params: Promise.resolve({ id: caseId, eid: escalationId }),
    });

    expect(response.status).toBe(422);
    expect(callOrder).toEqual(["transition"]);
    expect(callOrder).not.toContain("escalation_update");
    expect(mocks.escalationUpdate).not.toHaveBeenCalled();
  });

  it("source order: transitionCase appears before escalations update in mark-sent route", () => {
    const source = readFileSync(
      join(
        process.cwd(),
        "app/api/v1/cases/[id]/escalations/[eid]/mark-sent/route.ts",
      ),
      "utf8",
    );
    const transitionAt = source.indexOf("await transitionCase(");
    const sentUpdateAt = source.indexOf('status: "sent"');
    expect(transitionAt).toBeGreaterThan(0);
    expect(sentUpdateAt).toBeGreaterThan(transitionAt);
  });

  it("migration 022 allows mark_sent from intake_scoping", () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        "supabase/migrations/022_mark_sent_from_prep_statuses.sql",
      ),
      "utf8",
    );
    expect(sql).toContain("intake_scoping");
    expect(sql).toContain("user.mark_sent");
    expect(sql).toContain("awaiting_response");
  });
});
