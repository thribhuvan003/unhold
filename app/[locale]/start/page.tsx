'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { ConsentScreen } from '@/components/legal/ConsentScreen';
import { IntakeWizard, type IntakeWizardResult } from '@/components/intake/IntakeWizard';
import { SAVE_CASE_STORAGE_KEY } from '@/lib/case/save-case-storage';
import { track } from '@/lib/analytics/events';

/**
 * The single intake entry point: consent (blocks B + F) → 5-question wizard →
 * case created → save-case interstitial → workspace.
 */
export default function StartPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<'consent' | 'questions'>('consent');
  const [aiConsent, setAiConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCase(result: IntakeWizardResult) {
    setSubmitting(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': crypto.randomUUID(),
      };

      const sessionRes = await fetch('/api/v1/guest/sessions', { method: 'POST' });
      if (!sessionRes.ok) throw new Error('Could not start a secure guest session. Please try again.');

      // "Other / not sure" keeps a provisional slug for the DB row only — the
      // user-visible bank name comes from intake_json and is never guessed.
      const intakeJson = result.bankSlug
        ? result.intakeJson
        : { ...result.intakeJson, provisional_bank_slug: 'state-bank-of-india' };

      const res = await fetch('/api/v1/cases', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          bank_slug: result.bankSlug ?? 'state-bank-of-india',
          victim_role: result.victimRole,
          frozen_amount_paise: result.frozenAmountPaise,
          ...(result.freezeType ? { freeze_type: result.freezeType } : {}),
          ...(result.freezeReason ? { freeze_reason: result.freezeReason } : {}),
          intake_json: intakeJson,
          consent_accepted: true,
          ai_consent_accepted: aiConsent,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(
          json.error?.message ??
            'We could not create your case right now. Nothing was lost — please try again in a moment.',
        );
      }

      try {
        sessionStorage.setItem(
          SAVE_CASE_STORAGE_KEY,
          JSON.stringify({
            caseId: json.id,
            publicId: json.public_id,
            recoveryCode: json.recovery_code,
          }),
        );
      } catch {
        // sessionStorage full / private mode — save page still shows public_id if present
      }

      track('intake_completed');
      router.push(`/cases/${json.id}/save`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'We could not create your case right now. Nothing was lost — please try again in a moment.',
      );
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto flex max-w-[430px] flex-col gap-4">
      {phase === 'consent' ? (
        <ConsentScreen
          onBack={() => router.push('/')}
          onContinue={(aiConsentAccepted) => {
            setAiConsent(aiConsentAccepted);
            setPhase('questions');
            track('case_started');
          }}
        />
      ) : (
        <IntakeWizard onComplete={createCase} submitting={submitting} onExit={() => router.push('/')} />
      )}

      {error ? (
        <p role="alert" className="u-alert u-alert-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
