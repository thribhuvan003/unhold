'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { AI_PROCESSING_DISCLAIMER, INTAKE_DISCLAIMER } from '@/lib/constants/disclaimers';
import { ConsentCheckbox } from '@/components/legal/ConsentCheckbox';
import { Button } from '@/components/ui/Button';

type DisclaimerModalProps = {
  open: boolean;
  onAccept: (aiConsentAccepted: boolean) => void | Promise<void>;
  onDecline?: () => void;
};

export function DisclaimerModal({ open, onAccept, onDecline }: DisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleContinue() {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await onAccept(aiConsent);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm sm:items-center"
    >
      <div className="animate-scale-in u-card w-full max-w-lg overflow-hidden shadow-xl">
        <div className="border-b border-[var(--border)] bg-[var(--paper)] px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--forest-muted)] text-[var(--forest)]">
              <Shield className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <h2 id="disclaimer-modal-title" className="font-display text-xl font-semibold text-[var(--ink)]">
              Before you continue
            </h2>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed text-[var(--ink-muted)]">{INTAKE_DISCLAIMER}</p>

          <div className="mt-4">
            <ConsentCheckbox
              id="intake-disclaimer-accept"
              label="I have read and agree to the above. I understand LienLiberator is not a law firm and does not guarantee outcomes."
              checked={accepted}
              onChange={setAccepted}
            />
          </div>

          <p className="mt-5 text-sm leading-relaxed text-[var(--ink-muted)]">{AI_PROCESSING_DISCLAIMER}</p>

          <div className="mt-4">
            <ConsentCheckbox
              id="ai-processing-consent"
              label="I consent to AI processing of my case data and documents, including by providers outside India (optional)."
              checked={aiConsent}
              onChange={setAiConsent}
              required={false}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-[var(--border)] bg-[var(--paper)] px-6 py-4 sm:flex-row sm:justify-end">
          {onDecline ? (
            <Button variant="ghost" onClick={onDecline} className="text-[var(--ink)]">
              Cancel
            </Button>
          ) : null}
          <Button variant="secondary" onClick={handleContinue} disabled={!accepted || submitting}>
            {submitting ? 'Saving…' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}