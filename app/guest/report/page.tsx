'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DisclaimerModal } from '@/components/legal/DisclaimerModal';

export default function GuestReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  async function startGuestIntake(aiConsentAccepted: boolean) {
    setLoading(true);
    setError(null);
    try {
      const sessionRes = await fetch('/api/v1/guest/sessions', { method: 'POST' });
      const sessionJson = await sessionRes.json();
      if (!sessionRes.ok) {
        throw new Error(sessionJson.error?.message ?? 'Failed to start guest session');
      }

      const caseRes = await fetch('/api/v1/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          'X-Guest-Token': sessionJson.device_token,
        },
        body: JSON.stringify({
          bank_slug: 'state-bank-of-india',
          freeze_reason: 'cyber_upi_chain',
          victim_role: 'innocent_receiver',
          intake_json: { source: 'guest_report' },
          consent_accepted: true,
          ai_consent_accepted: aiConsentAccepted,
        }),
      });
      const caseJson = await caseRes.json();
      if (!caseRes.ok) {
        throw new Error(caseJson.error?.message ?? 'Failed to create case');
      }

      router.push(`/cases/${caseJson.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-[#0B1F33]">Quick freeze report</h1>
      <p className="text-slate-700">Under 30 seconds. No account required. Data stored in Supabase — not localStorage.</p>
      <button
        type="button"
        onClick={() => setShowDisclaimer(true)}
        disabled={loading}
        className="min-h-[44px] rounded bg-[#1F6B8A] px-5 font-medium text-white disabled:opacity-60"
      >
        {loading ? 'Starting…' : 'Start my case'}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <DisclaimerModal
        open={showDisclaimer}
        onDecline={() => setShowDisclaimer(false)}
        onAccept={async (aiConsentAccepted) => {
          setShowDisclaimer(false);
          await startGuestIntake(aiConsentAccepted);
        }}
      />
    </section>
  );
}