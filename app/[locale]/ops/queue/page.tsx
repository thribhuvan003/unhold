'use client';

import { useEffect, useState } from 'react';
import { QueueTable } from '@/components/ops/QueueTable';

type QueueResponse = {
  queue: Array<{
    id: string;
    case_id: string;
    queue_reason: string;
    priority: number;
    status: string;
    created_at: string;
    cases?: {
      public_id: string;
      status: string;
      escalation_level: string | null;
      bank_id: string | null;
    } | null;
  }>;
  error?: { message: string };
};

export default function OpsQueuePage() {
  const [data, setData] = useState<QueueResponse['queue']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/ops/queue');
        const payload: QueueResponse = await response.json();
        if (!response.ok) {
          setError(payload.error?.message ?? 'Failed to load ops queue');
          setData([]);
          return;
        }
        setData(payload.queue ?? []);
      } catch {
        setError('Network error loading queue');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-[#0B1F33]">Human ops queue</h1>
      <p className="mt-2 text-sm text-slate-600">
        Operator JWT required. Cases are never auto-resolved — human review only.
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6">
        <QueueTable items={data} loading={loading} />
      </div>
    </main>
  );
}