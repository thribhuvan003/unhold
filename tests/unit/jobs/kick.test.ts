import { afterEach, describe, expect, it, vi } from "vitest";

const processAgentJobs = vi.fn();

vi.mock("@/lib/jobs/process", () => ({
  processAgentJobs: (...args: unknown[]) => processAgentJobs(...args),
}));

describe("kickPendingJobs", () => {
  afterEach(() => {
    processAgentJobs.mockReset();
    vi.resetModules();
  });

  it("drains the queue once and collapses concurrent kicks", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    processAgentJobs.mockImplementation(async () => {
      await gate;
      return { processed: 1, succeeded: 1, failed: 0 };
    });

    const { kickPendingJobs } = await import("@/lib/jobs/kick");

    const a = kickPendingJobs(3);
    await vi.waitFor(() => {
      expect(processAgentJobs).toHaveBeenCalledTimes(1);
    });

    const b = kickPendingJobs(3);
    // Still a single in-flight drain.
    expect(processAgentJobs).toHaveBeenCalledTimes(1);

    release();
    await expect(a).resolves.toEqual({ processed: 1, succeeded: 1, failed: 0 });
    await expect(b).resolves.toEqual({ processed: 1, succeeded: 1, failed: 0 });
  });

  it("swallows process failures so callers stay non-blocking", async () => {
    processAgentJobs.mockRejectedValue(new Error("boom"));
    const { kickPendingJobs } = await import("@/lib/jobs/kick");
    await expect(kickPendingJobs(2)).resolves.toBeNull();
  });
});
