import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { ApiError } from "@/lib/api/errors";

const mocks = vi.hoisted(() => ({
  requireRequestAuth: vi.fn(),
  assertCaseAccess: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/api/case-access", () => ({
  requireRequestAuth: mocks.requireRequestAuth,
  assertCaseAccess: mocks.assertCaseAccess,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));
vi.mock("@/lib/escalations/proof-gates", () => ({
  checkProofGates: vi.fn(),
  assertProofGate: vi.fn(),
}));
vi.mock("@/lib/loops/case-tick", () => ({ runCaseTick: vi.fn() }));
vi.mock("@/lib/state-machine/transition", () => ({ transitionCase: vi.fn() }));

import { POST as approve } from "@/app/api/v1/cases/[id]/escalations/[eid]/approve/route";
import { POST as markSent } from "@/app/api/v1/cases/[id]/escalations/[eid]/mark-sent/route";

const caseId = "22222222-2222-4222-8222-222222222222";
const escalationId = "44444444-4444-4444-8444-444444444444";
const auth = {
  userId: "user-1",
  guestSessionId: null,
  actorType: "user" as const,
  actorId: "user-1",
};

describe("escalation authorization boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRequestAuth.mockResolvedValue(auth);
    mocks.assertCaseAccess.mockRejectedValue(
      new ApiError(403, "forbidden", "Editor access required"),
    );
  });

  it("denies approve before creating an admin data client", async () => {
    const response = await approve(
      new NextRequest(
        `http://localhost/api/v1/cases/${caseId}/escalations/${escalationId}/approve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      ),
      { params: Promise.resolve({ id: caseId, eid: escalationId }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.assertCaseAccess).toHaveBeenCalledWith(caseId, auth, "editor");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });

  it("denies mark-sent before idempotency or admin data access", async () => {
    const response = await markSent(
      new NextRequest(
        `http://localhost/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      ),
      { params: Promise.resolve({ id: caseId, eid: escalationId }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.assertCaseAccess).toHaveBeenCalledWith(caseId, auth, "editor");
    expect(mocks.createAdminClient).not.toHaveBeenCalled();
  });
});
