'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GuidedIntakeForm, type GuidedIntakeResult } from '@/components/intake/GuidedIntakeForm';

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCase(result: GuidedIntakeResult) {
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
          victim_role: result.victimRole,
          frozen_amount_paise: result.frozenAmountPaise,
          intake_json: result.intakeJson,
          consent_accepted: true,
          ai_consent_accepted: result.aiConsentAccepted,
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
      <p className="text-slate-600">
        SBI cyber UPI chain playbook (guest or signed-in). A few guided questions help our AI route your case
        correctly.
      </p>
      <GuidedIntakeForm onComplete={createCase} submitting={loading} />
      {error ? <p className="text-red-700">{error}</p> : null}
    </section>
  );
}
