'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuidedIntakeForm, type GuidedIntakeResult } from '@/components/intake/GuidedIntakeForm';

export default function GuestReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startGuestIntake(result: GuidedIntakeResult) {
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
          victim_role: result.victimRole,
          frozen_amount_paise: result.frozenAmountPaise,
          intake_json: result.intakeJson,
          consent_accepted: true,
          ai_consent_accepted: result.aiConsentAccepted,
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
    <section className="mx-auto max-w-xl space-y-8">
      <header className="animate-fade-up space-y-2">
        <p className="type-eyebrow">~2 minutes · no account</p>
        <h1 className="type-display mt-1 text-3xl">Quick freeze report</h1>
        <p className="type-lead text-[0.9375rem]">
          A few guided questions to help us understand your situation. Data stored securely in Supabase — not
          localStorage.
        </p>
      </header>

      <div className="animate-fade-up stagger-1">
        <GuidedIntakeForm onComplete={startGuestIntake} submitting={loading} />
      </div>

      {error ? (
        <p role="alert" className="u-alert u-alert-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}