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
          victim_role: result.victimRole,
          frozen_amount_paise: result.frozenAmountPaise,
          intake_json: {
            ...result.intakeJson,
            bank_unconfirmed: true,
            provisional_bank_slug: 'state-bank-of-india',
          },
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
    <section className="mx-auto max-w-xl space-y-8">
      <header className="animate-fade-up space-y-2">
        <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-[var(--forest)]">
          Official GRM/MRM prep
        </p>
        <h1 className="font-display text-3xl font-semibold text-[var(--ink)]">New case</h1>
        <p className="text-sm leading-relaxed text-[var(--ink-muted)]">
          A few guided questions help prepare your official bank/GRM package. You review and submit everything
          yourself.
        </p>
      </header>

      <div className="animate-fade-up stagger-1">
        <GuidedIntakeForm onComplete={createCase} submitting={loading} />
      </div>

      {error ? (
        <p
          role="alert"
          className="animate-scale-in rounded-[var(--radius-md)] border border-[var(--error)]/20 bg-[var(--error-muted)] px-4 py-3 text-sm text-[var(--error)]"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
