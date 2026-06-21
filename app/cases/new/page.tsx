'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DisclaimerModal } from '@/components/legal/DisclaimerModal';

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  async function createCase() {
    setLoading(true);
    setError(null);
    try {
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      };

      const sessionRes = await fetch('/api/v1/guest/sessions', { method: 'POST' });
      const sessionJson = await sessionRes.json();
      if (sessionRes.ok) {
        headers = { ...headers, 'X-Guest-Token': sessionJson.device_token };
      }

      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bank_slug: 'state-bank-of-india',
          freeze_reason: 'cyber_upi_chain',
          victim_role: 'innocent_receiver',
          consent_accepted: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Create failed');
      router.push(`/cases/${json.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold">New case</h1>
      <p className="text-slate-600">SBI cyber UPI chain playbook (guest or signed-in).</p>
      <button
        type="button"
        disabled={loading}
        onClick={() => setShowDisclaimer(true)}
        className="min-h-[44px] rounded bg-[#E67E00] px-5 text-white disabled:opacity-60"
      >
        {loading ? 'Creating…' : 'Create case'}
      </button>
      {error ? <p className="text-red-700">{error}</p> : null}
      <DisclaimerModal
        open={showDisclaimer}
        onDecline={() => setShowDisclaimer(false)}
        onAccept={async () => {
          setShowDisclaimer(false);
          await createCase();
        }}
      />
    </section>
  );
}