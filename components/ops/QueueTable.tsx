'use client';

type QueueItem = {
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
};

type QueueTableProps = {
  items: QueueItem[];
  loading?: boolean;
};

export function QueueTable({ items, loading = false }: QueueTableProps) {
  if (loading) {
    return <p className="text-sm text-slate-600">Loading queue…</p>;
  }

  if (items.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
        No pending human gates. Automation is running normally.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-slate-700">Case</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700">Reason</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700">Priority</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700">Status</th>
            <th className="px-4 py-3 text-left font-medium text-slate-700">Queued</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-mono text-xs">
                {item.cases?.public_id ?? item.case_id.slice(0, 8)}
                {item.cases?.escalation_level && (
                  <span className="ml-2 text-slate-500">{item.cases.escalation_level}</span>
                )}
              </td>
              <td className="px-4 py-3">{item.queue_reason}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    item.priority >= 100
                      ? 'font-semibold text-red-700'
                      : item.priority >= 60
                        ? 'text-amber-700'
                        : 'text-slate-700'
                  }
                >
                  {item.priority}
                </span>
              </td>
              <td className="px-4 py-3 capitalize">{item.status}</td>
              <td className="px-4 py-3 text-slate-600">
                {new Date(item.created_at).toLocaleString('en-IN')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}