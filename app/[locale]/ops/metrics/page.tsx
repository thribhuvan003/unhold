'use client';

import { useEffect, useState } from 'react';

type OpsMetrics = {
  generated_at: string;
  window_days: number;
  cases: { total: number; last_7d: number };
  jobs: {
    total: number;
    by_status: Record<string, number>;
    succeeded: number;
    failed: number;
    error_rate: number;
    avg_latency_ms: number | null;
    p95_latency_ms: number | null;
    total_cost_usd: number;
    by_type: Array<{ job_type: string; count: number; failed: number; avg_latency_ms: number | null }>;
  };
  recent_failures: Array<{ job_type: string; error_message: string | null; created_at: string }>;
};

type Resp = { metrics?: OpsMetrics; error?: { message: string } };

function ms(v: number | null): string {
  return v == null ? '—' : v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${v}ms`;
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="u-card p-4">
      <p className="type-caption text-ink-faint">{label}</p>
      <p className="type-display mt-1 text-[1.4rem]">{value}</p>
      {sub ? <p className="type-caption mt-0.5 text-ink-faint">{sub}</p> : null}
    </div>
  );
}

export default function OpsMetricsPage() {
  const [data, setData] = useState<OpsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/v1/ops/metrics');
        const payload: Resp = await res.json();
        if (!res.ok) {
          setError(payload.error?.message ?? 'Failed to load metrics');
          return;
        }
        setData(payload.metrics ?? null);
      } catch {
        setError('Network error loading metrics');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main style={{ maxWidth: 920, margin: '0 auto', padding: 16 }}>
      <p className="type-eyebrow">Operations</p>
      <h1 className="type-display-xl mt-2">System metrics</h1>

      {loading ? <p className="type-caption mt-6 text-ink-faint">Loading…</p> : null}

      {error ? (
        <div className="u-card mt-6 p-5">
          <p className="type-display text-[0.95rem]">Operator authentication required</p>
          <p className="type-caption mt-1 text-ink-faint">{error}. Sign in with an operator account to view metrics.</p>
        </div>
      ) : null}

      {data ? (
        <div className="mt-6 flex flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <Stat label="Cases (total)" value={String(data.cases.total)} sub={`${data.cases.last_7d} in last 7d`} />
            <Stat label="Jobs" value={String(data.jobs.total)} sub={`${data.jobs.succeeded} ok · ${data.jobs.failed} failed`} />
            <Stat label="Error rate" value={`${(data.jobs.error_rate * 100).toFixed(1)}%`} sub={`window: ${data.window_days}d`} />
            <Stat label="Avg latency" value={ms(data.jobs.avg_latency_ms)} sub={`p95 ${ms(data.jobs.p95_latency_ms)}`} />
            <Stat label="Total cost" value={`$${data.jobs.total_cost_usd.toFixed(2)}`} sub="agent jobs" />
            <Stat label="Generated" value={new Date(data.generated_at).toLocaleTimeString()} />
          </section>

          <section>
            <h2 className="type-display text-[0.95rem]">By job type</h2>
            <div className="u-card mt-2 overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="type-caption text-ink-faint">
                    <th className="px-4 py-2">Type</th>
                    <th className="px-4 py-2">Count</th>
                    <th className="px-4 py-2">Failed</th>
                    <th className="px-4 py-2">Avg latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data.jobs.by_type.map((t) => (
                    <tr key={t.job_type} className="border-t border-[var(--border-subtle,#e5e5e5)]">
                      <td className="px-4 py-2 font-medium">{t.job_type}</td>
                      <td className="px-4 py-2">{t.count}</td>
                      <td className="px-4 py-2">{t.failed}</td>
                      <td className="px-4 py-2">{ms(t.avg_latency_ms)}</td>
                    </tr>
                  ))}
                  {data.jobs.by_type.length === 0 ? (
                    <tr>
                      <td className="px-4 py-3 type-caption text-ink-faint" colSpan={4}>
                        No jobs in this window yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="type-display text-[0.95rem]">Recent failures</h2>
            <div className="u-card mt-2 p-4">
              {data.recent_failures.length === 0 ? (
                <p className="type-caption text-ink-faint">No recent failures. 🎉</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {data.recent_failures.map((f, i) => (
                    <li key={i} className="type-caption">
                      <span className="font-medium">{f.job_type}</span> ·{' '}
                      <span className="text-ink-faint">{new Date(f.created_at).toLocaleString()}</span>
                      <br />
                      <span className="text-ink-faint">{f.error_message ?? 'no message'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
