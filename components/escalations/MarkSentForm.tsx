'use client';

import { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

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
    <form onSubmit={handleSubmit} className="u-card animate-fade-up space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="u-icon-box u-icon-box-forest h-10 w-10 shrink-0">
          <Send className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <div>
          <h3 className="type-display text-lg">Mark {level} letter as sent</h3>
          <p className="type-caption mt-1 text-[0.875rem] text-ink-muted">
            Copy-only draft — you send the letter yourself. Upload proof (screenshot or sent-email
            confirmation) to unlock the next escalation level.
          </p>
        </div>
      </div>

      {proofGateBlocked ? (
        <div role="alert" className="u-alert u-alert-warn">
          {blockedReason ?? 'Prior level send proof is required before marking this letter sent.'}
        </div>
      ) : null}

      <label className="block text-sm font-medium text-ink">
        Send proof evidence ID
        <input
          type="text"
          name="proof_evidence_id"
          value={proofEvidenceId}
          onChange={(e) => setProofEvidenceId(e.target.value)}
          placeholder="UUID from uploaded letter_sent_proof"
          className="u-input type-mono-data mt-1.5"
          required
          disabled={proofGateBlocked || submitting || success}
          aria-label="Proof evidence ID"
        />
      </label>

      {error ? (
        <p role="alert" className="u-alert u-alert-error">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="u-alert u-alert-success flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Letter marked sent. Response deadline tracked — we will remind you before the statutory wait ends.
        </p>
      ) : null}

      <Button
        type="submit"
        variant="secondary"
        disabled={proofGateBlocked || submitting || success}
        className={cn('w-full')}
      >
        {submitting ? 'Saving…' : 'I sent this letter — save proof'}
      </Button>
    </form>
  );
}