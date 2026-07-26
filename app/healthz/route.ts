import { collectHealthChecks } from "@/lib/health/checks";

export const dynamic = "force-dynamic";

/**
 * Hard route for uptime probes. Prefer this when edge rewrites or middleware
 * are mis-ordered; mirrors GET /api/v1/health.
 */
export async function GET(): Promise<Response> {
  const report = collectHealthChecks();
  return Response.json(report, {
    status: report.ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
