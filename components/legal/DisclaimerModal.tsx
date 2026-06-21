'use client';

import { useState } from 'react';
import { INTAKE_DISCLAIMER } from '@/lib/constants/disclaimers';
import { ConsentCheckbox } from '@/components/legal/ConsentCheckbox';

type DisclaimerModalProps = {
  open: boolean;
  onAccept: () => void | Promise<void>;
  onDecline?: () => void;
};

export function DisclaimerModal({ open, onAccept, onDecline }: DisclaimerModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function handleContinue() {
    if (!accepted) return;
    setSubmitting(true);
    try {
      await onAccept();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 id="disclaimer-modal-title" className="text-xl font-semibold text-[#0B1F33]">
          Before you continue
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{INTAKE_DISCLAIMER}</p>

        <div className="mt-4">
          <ConsentCheckbox
            id="intake-disclaimer-accept"
            label="I have read and agree to the above. I understand LienLiberator is not a law firm and does not guarantee outcomes."
            checked={accepted}
            onChange={setAccepted}
          />
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onDecline && (
            <button
              type="button"
              onClick={onDecline}
              className="min-h-[44px] rounded-md border border-slate-300 px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleContinue}
            disabled={!accepted || submitting}
            className="min-h-[44px] rounded-md bg-[#1F6B8A] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}