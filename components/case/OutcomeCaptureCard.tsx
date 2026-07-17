'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { track } from '@/lib/analytics/events';

type Outcome = 'unfrozen' | 'partially_unfrozen' | 'response_received' | 'still_frozen';

const OPTIONS: { value: Outcome; label: string }[] = [
  { value: 'unfrozen', label: '✅ Account unfrozen' },
  { value: 'partially_unfrozen', label: '🔓 Partially released' },
  { value: 'response_received', label: '📩 Bank / authority responded' },
  { value: 'still_frozen', label: '⏳ Still frozen' },
];

const LABEL_BY_VALUE = Object.fromEntries(OPTIONS.map((o) => [o.value, o.label]));

/**
 * One-tap outcome logging — the follow-through step after letters go out.
 * Self-reported, insert-only; powers the /impact "reported unfrozen" count.
 * Testimonial is strictly opt-in and only offered on a good outcome.
 */
export function OutcomeCaptureCard({
  caseId,
  initialOutcome,
}: {
  caseId: string;
  initialOutcome: Outcome | null;
}) {
  const [current, setCurrent] = useState<Outcome | null>(initialOutcome);
  const [saving, setSaving] = useState<Outcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTestimonial, setShowTestimonial] = useState(false);
  const [testimonial, setTestimonial] = useState('');
  const [testimonialSaved, setTestimonialSaved] = useState(false);
  const [sharing, setSharing] = useState(false);

  async function report(outcome: Outcome, optIn = false, text = '') {
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/outcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          testimonial_opt_in: optIn,
          ...(optIn && text ? { testimonial_text: text } : {}),
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error?.message ?? 'Could not save — please try again.');
      }
      track('outcome_logged', { outcome });
      setCurrent(outcome);
      if (outcome === 'unfrozen' && !optIn) setShowTestimonial(true);
      if (optIn) setTestimonialSaved(true);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error — please try again.');
      return false;
    }
  }

  return (
    <section className="u-card animate-fade-up p-4" data-testid="outcome-capture-card">
      <p className="text-[0.90625rem] font-semibold text-[var(--ink)]">
        What happened with your case?
      </p>
      <p className="mt-1 text-[0.78125rem] leading-normal text-[var(--ink-muted)]">
        One tap. Self-reported outcomes power the honest public counts on the impact page and
        help others stuck in the same mess.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            disabled={saving !== null}
            onClick={async () => {
              setSaving(o.value);
              await report(o.value);
              setSaving(null);
            }}
            className={
              'flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-md)] border px-2 py-2 text-[0.78125rem] font-semibold transition-colors disabled:opacity-60 ' +
              (current === o.value
                ? 'border-[var(--success)]/50 bg-[var(--success)]/10 text-[var(--ink)]'
                : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--ink-muted)] hover:border-[var(--color-sky-deep)]/40')
            }
          >
            {saving === o.value ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
            {o.label}
          </button>
        ))}
      </div>

      {current ? (
        <p className="mt-2.5 text-[0.78125rem] font-semibold text-[var(--success)]">
          ✓ Recorded: {LABEL_BY_VALUE[current]}. You can update this anytime.
        </p>
      ) : null}

      {showTestimonial && !testimonialSaved ? (
        <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3">
          <p className="text-[0.8125rem] font-semibold text-[var(--ink)]">
            That's great news. Share a line to help the next person? (optional)
          </p>
          <textarea
            className="u-input mt-2 min-h-[70px] w-full resize-y p-2.5 text-[0.84375rem]"
            maxLength={600}
            value={testimonial}
            onChange={(e) => setTestimonial(e.target.value)}
            placeholder="e.g. Branch letter + NCRP reference worked — released in 12 days."
          />
          <p className="mt-1.5 text-[0.6875rem] leading-relaxed text-[var(--ink-faint)]">
            Shared anonymously in public stats only if you tap share. No name, account or case
            details are ever shown.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={sharing || testimonial.trim().length === 0}
              onClick={async () => {
                setSharing(true);
                await report('unfrozen', true, testimonial.trim());
                setSharing(false);
              }}
              className="u-btn u-btn-secondary min-h-[40px] flex-1 text-[0.8125rem] font-semibold disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : 'Share it'}
            </button>
            <button
              type="button"
              disabled={sharing}
              onClick={() => setShowTestimonial(false)}
              className="u-btn u-btn-ghost min-h-[40px] flex-1 text-[0.8125rem]"
            >
              No thanks
            </button>
          </div>
        </div>
      ) : null}

      {testimonialSaved ? (
        <p className="mt-2 text-[0.78125rem] text-[var(--ink-muted)]">
          ✓ Thank you — your line may help the next person decide their first step.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="u-alert u-alert-error mt-2.5">
          {error}
        </p>
      ) : null}
    </section>
  );
}
