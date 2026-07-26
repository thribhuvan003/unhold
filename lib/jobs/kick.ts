import "server-only";

/**
 * Fire-and-forget drain of pending agent_jobs so user-facing work
 * (verifier / drafter) does not wait solely for the Hobby cron.
 *
 * Two paths:
 * 1. In-process `processAgentJobs` (same serverless isolate, single-flight)
 * 2. HTTP POST to `/api/v1/internal/jobs/process` (wakes a fresh worker if
 *    the in-process path is busy/unavailable — agents stay alive)
 */

type KickResult = {
  processed: number;
  succeeded: number;
  failed: number;
  reclaimed?: number;
};

let inFlight: Promise<KickResult | null> | null = null;

function appBaseUrl(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    process.env.VERCEL_URL?.trim() ||
    "";
  if (!raw) return null;
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw.replace(/\/$/, "");
  }
  return `https://${raw.replace(/\/$/, "")}`;
}

/** Best-effort wake of the job worker via authenticated internal route. */
export async function httpKickJobWorker(limit = 8): Promise<boolean> {
  const base = appBaseUrl();
  const secret = process.env.CRON_SECRET?.trim();
  if (!base || !secret) return false;

  try {
    const res = await fetch(`${base}/api/v1/internal/jobs/process`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ limit }),
      // Do not hang the parent forever if the worker is slow.
      signal: AbortSignal.timeout(55_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function kickPendingJobs(limit = 8): Promise<KickResult | null> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const { processAgentJobs } = await import("@/lib/jobs/process");
      const result = await processAgentJobs({ limit });
      // If nothing was processed (empty queue race) still ok; if we had work
      // and more may remain, the HTTP kick below can drain residual.
      if (result.processed >= limit) {
        void httpKickJobWorker(limit);
      }
      return result;
    } catch {
      // Isolate may lack DB; try HTTP worker so agents are not "dead".
      await httpKickJobWorker(limit);
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Schedule a queue kick after the HTTP response when possible (Next `after`),
 * otherwise run immediately. Always dual-paths: in-process + HTTP wake.
 */
export function scheduleJobKick(limit = 8): void {
  const run = () => {
    void (async () => {
      await kickPendingJobs(limit);
      // Second wake in a separate worker so backlog never sits until cron.
      void httpKickJobWorker(limit);
    })();
  };

  void import("next/server")
    .then(({ after }) => {
      try {
        after(run);
      } catch {
        run();
      }
    })
    .catch(run);
}
