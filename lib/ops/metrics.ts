import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Self-hosted observability — aggregates production metrics straight from
 * Postgres (agent_jobs, cases, swarm_events). No external tracing service, so
 * no case/PII data leaves the stack (important for a legal tool). Powers the
 * operator-only /ops/metrics dashboard.
 */

export type OpsMetrics = {
  generated_at: string;
  window_days: number;
  cases: { total: number; last_7d: number };
  jobs: {
    total: number;
    by_status: Record<string, number>;
    succeeded: number;
    failed: number;
    error_rate: number; // 0..1
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
    total_cost_usd: number;
    by_type: Array<{ job_type: string; count: number; failed: number; avg_latency_ms: number | null }>;
  };
  recent_failures: Array<{ job_type: string; error_message: string | null; created_at: string }>;
};

function avg(xs: number[]): number | null {
  return xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null;
}

function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export async function collectOpsMetrics(windowDays = 30): Promise<OpsMetrics> {
  const admin = createAdminClient();
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [casesTotalRes, cases7Res, jobsRes, failuresRes] = await Promise.all([
    admin.from('cases').select('*', { count: 'exact', head: true }),
    admin.from('cases').select('*', { count: 'exact', head: true }).gte('created_at', since7),
    admin
      .from('agent_jobs')
      .select('job_type, status, cost_usd, started_at, completed_at')
      .gte('created_at', since),
    admin
      .from('agent_jobs')
      .select('job_type, error_message, created_at')
      .in('status', ['failed', 'dead_letter'])
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const rows = jobsRes.data ?? [];
  const byStatus: Record<string, number> = {};
  let totalCost = 0;
  const latencies: number[] = [];
  const byTypeMap = new Map<string, { count: number; failed: number; lat: number[] }>();

  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    totalCost += Number(r.cost_usd ?? 0);

    let lat: number | null = null;
    if (r.started_at && r.completed_at) {
      const ms = new Date(r.completed_at).getTime() - new Date(r.started_at).getTime();
      if (ms >= 0) {
        lat = ms;
        latencies.push(ms);
      }
    }

    const t = byTypeMap.get(r.job_type) ?? { count: 0, failed: 0, lat: [] };
    t.count += 1;
    if (r.status === 'failed' || r.status === 'dead_letter') t.failed += 1;
    if (lat != null) t.lat.push(lat);
    byTypeMap.set(r.job_type, t);
  }

  const succeeded = byStatus['completed'] ?? 0;
  const failed = (byStatus['failed'] ?? 0) + (byStatus['dead_letter'] ?? 0);

  return {
    generated_at: new Date().toISOString(),
    window_days: windowDays,
    cases: { total: casesTotalRes.count ?? 0, last_7d: cases7Res.count ?? 0 },
    jobs: {
      total: rows.length,
      by_status: byStatus,
      succeeded,
      failed,
      error_rate: rows.length ? failed / rows.length : 0,
      avg_latency_ms: avg(latencies),
      p95_latency_ms: percentile(latencies, 95),
      total_cost_usd: Number(totalCost.toFixed(4)),
      by_type: [...byTypeMap.entries()]
        .map(([job_type, v]) => ({ job_type, count: v.count, failed: v.failed, avg_latency_ms: avg(v.lat) }))
        .sort((a, b) => b.count - a.count),
    },
    recent_failures: (failuresRes.data ?? []).map((f) => ({
      job_type: f.job_type,
      error_message: f.error_message,
      created_at: f.created_at,
    })),
  };
}
