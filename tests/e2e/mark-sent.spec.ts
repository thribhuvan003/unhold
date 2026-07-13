import { test, expect } from "@playwright/test";

test.describe("mark-sent proof gates @smoke", () => {
  test("mark-sent API rejects missing proof_evidence_id", async ({
    request,
  }) => {
    const caseId = "00000000-0000-4000-8000-000000000001";
    const escalationId = "00000000-0000-4000-8000-000000000002";

    const response = await request.post(
      `/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
      {
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "550e8400-e29b-41d4-a716-446655440000",
        },
        data: {},
      },
    );

    expect([400, 401, 422]).toContain(response.status());
    const body = await response.json();
    expect(body.error).toBeDefined();
  });

  test("mark-sent API requires Idempotency-Key header", async ({ request }) => {
    const caseId = "00000000-0000-4000-8000-000000000001";
    const escalationId = "00000000-0000-4000-8000-000000000002";

    const response = await request.post(
      `/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
      {
        headers: { "Content-Type": "application/json" },
        data: {
          proof_evidence_id: "550e8400-e29b-41d4-a716-446655440001",
        },
      },
    );

    expect([400, 401]).toContain(response.status());
    const body = await response.json();
    expect(["validation_failed", "unauthorized"]).toContain(body.error.code);
  });
});
