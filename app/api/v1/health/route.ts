import { collectHealthChecks } from '@/lib/health/checks';

export const dynamic = 'force-dynamic';

/**
 * Public configuration diagnostic. Intentionally requires no auth and never
 * throws, so it stays reachable even when every dependency is misconfigured —
 * that is the whole point: it tells a tester WHICH env var is missing instead of
 * surfacing the generic "An unexpected error occurred".
 *
 * Returns booleans + static hints only — never a secret value.
 * 200 when all required deps are configured, 503 otherwise.
 */
export async function GET(): Promise<Response> {
  const report = collectHealthChecks();
  return Response.json(report, { status: report.ok ? 200 : 503 });
}
