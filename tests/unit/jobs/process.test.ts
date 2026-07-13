import { describe, expect, it } from "vitest";
import { getJobFailureTransition } from "@/lib/jobs/process";

describe("getJobFailureTransition", () => {
  const failedAt = new Date("2026-07-14T10:00:00.000Z");

  it("returns pending exponential retries before max attempts", () => {
    expect(
      getJobFailureTransition({ attempts: 1, maxAttempts: 3, failedAt }),
    ).toEqual({
      status: "pending",
      scheduled_at: "2026-07-14T10:01:00.000Z",
      completed_at: null,
    });
    expect(
      getJobFailureTransition({ attempts: 2, maxAttempts: 4, failedAt }),
    ).toEqual({
      status: "pending",
      scheduled_at: "2026-07-14T10:02:00.000Z",
      completed_at: null,
    });
  });

  it("dead-letters the final allowed attempt", () => {
    expect(
      getJobFailureTransition({ attempts: 3, maxAttempts: 3, failedAt }),
    ).toEqual({
      status: "dead_letter",
      scheduled_at: "2026-07-14T10:00:00.000Z",
      completed_at: "2026-07-14T10:00:00.000Z",
    });
  });
});
