import { describe, expect, it } from "vitest";
import {
  getJobFailureTransition,
  reclaimStaleRunningJobs,
} from "@/lib/jobs/process";

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

describe("reclaimStaleRunningJobs", () => {
  it("returns 0 when update errors", async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            lt: () => ({
              select: async () => ({ data: null, error: { message: "x" } }),
            }),
          }),
        }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(reclaimStaleRunningJobs(supabase as any)).resolves.toBe(0);
  });

  it("counts reclaimed ids", async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            lt: () => ({
              select: async () => ({
                data: [{ id: "a" }, { id: "b" }],
                error: null,
              }),
            }),
          }),
        }),
      }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(reclaimStaleRunningJobs(supabase as any)).resolves.toBe(2);
  });
});
