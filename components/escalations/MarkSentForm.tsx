'use client';

import { useState } from 'react';

type MarkSentFormProps = {
  caseId: string;
  escalationId: string;
  level: string;
  proofGateBlocked?: boolean;
  blockedReason?: string;
  onSuccess?: () => void;
};

export function MarkSentForm({
  caseId,
  escalationId,
  level,
  proofGateBlocked = false,
  blockedReason,
  onSuccess,
}: MarkSentFormProps) {
  const [proofEvidenceId, setProofEvidenceId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (proofGateBlocked) {
      setError(blockedReason ?? 'Complete prior level proof before marking sent.');
      return;
    }

    if (!proofEvidenceId.trim()) {
      setError('Upload send proof (screenshot or email confirmation) before marking sent.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        `/api/v1/cases/${caseId}/escalations/${escalationId}/mark-sent`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': crypto.randomUUID(),
          },
          body: JSON.stringify({ proof_evidence_id: proofEvidenceId.trim() }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        const guard = payload?.error?.guard;
        const message = payload?.error?.message ?? 'Failed to mark letter as sent';
        setError(guard ? `${message} (${guard})` : message);
        return;
      }

      setSuccess(true);
      onSuccess?.();
    } catch {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-slate-200 p-4">
      <div>
        <h3 className="text-lg font-semibold text-[#0B1F33]">Mark {level} letter as sent</h3>
        <p className="mt-1 text-sm text-slate-600">
          Copy-only draft — you send the letter yourself. Upload proof (screenshot or sent-email
          confirmation) to unlock the next escalation level.
        </p>
      </div>

      {proofGateBlocked && (
        <div
          role="alert"
          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {blockedReason ?? 'Prior level send proof is required before marking this letter sent.'}
        </div>
      )}

      <label className="block text-sm font-medium text-[#0B1F33]">
        Send proof evidence ID
        <input
          type="text"
          name="proof_evidence_id"
          value={proofEvidenceId}
          onChange={(e) => setProofEvidenceId(e.target.value)}
          placeholder="UUID from uploaded letter_sent_proof"
          className="mt-1 min-h-[44px] w-full rounded-md border border-slate-300 px-3 py-2 text-base"
          required
          disabled={proofGateBlocked || submitting || success}
          aria-label="Proof evidence ID"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {success && (
        <p className="text-sm text-green-700">
          Letter marked sent. Response deadline tracked — we will remind you before the statutory
          wait ends.
        </p>
      )}

      <button
        type="submit"
        disabled={proofGateBlocked || submitting || success}
        className="min-h-[44px] w-full rounded-md bg-[#1F6B8A] px-4 py-2 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? 'Saving…' : 'I sent this letter — save proof'}
      </button>
    </form>
  );
}