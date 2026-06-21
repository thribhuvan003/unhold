'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CaseSummary {
  id: string;
  public_id: string;
  status: string;
}

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/v1/cases');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to load cases');
        return;
      }
      setCases(json.cases ?? []);
    })();
  }, []);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#0B1F33]">My cases</h1>
        <Link href="/cases/new" className="min-h-[44px] rounded bg-[#1F6B8A] px-4 py-2 text-white no-underline">
          New case
        </Link>
      </div>
      {error ? <p className="text-red-700">{error}</p> : null}
      <ul className="divide-y divide-slate-200 rounded border border-slate-200 bg-white">
        {cases.map((item) => (
          <li key={item.id} className="px-4 py-3">
            <Link href={`/cases/${item.id}`} className="font-medium no-underline">
              {item.public_id}
            </Link>
            <span className="ml-2 text-sm text-slate-500">{item.status}</span>
          </li>
        ))}
        {cases.length === 0 && !error ? (
          <li className="px-4 py-6 text-sm text-slate-500">No cases yet. Start a guest report or create a new case.</li>
        ) : null}
      </ul>
    </section>
  );
}