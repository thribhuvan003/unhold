'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import { DisclaimerModal } from '@/components/legal/DisclaimerModal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

export type GuidedIntakeResult = {
  intakeJson: Record<string, unknown>;
  victimRole: 'victim' | 'innocent_receiver';
  frozenAmountPaise?: number;
  aiConsentAccepted: boolean;
};

interface GuidedIntakeFormProps {
  onComplete: (result: GuidedIntakeResult) => Promise<void> | void;
  submitting: boolean;
  /** Optional values prefilled from a Freeze Notice Analyzer run (pre-intake hero). */
  prefill?: { frozenAmountPaise?: number };
}

const TOTAL_STEPS = 5;
const MIN_NARRATION_LENGTH = 10;

const STEP_META = [
  {
    title: 'Your story',
    prompt: 'Tell me about the freeze in your own words.',
    hint: 'Include your bank, when it happened, and what you were doing when you noticed.',
  },
  {
    title: 'Your role',
    prompt: 'Did you send this money, or did it land in your account unexpectedly?',
    hint: 'This helps us route your case — there is no wrong answer.',
  },
  {
    title: 'The funds',
    prompt: 'Do you recognize where all the frozen money came from?',
    hint: 'Be honest — unknown incoming funds are common in UPI freeze cases.',
  },
  {
    title: 'Amount',
    prompt: 'Roughly how much money is frozen?',
    hint: 'Optional — a ballpark figure helps us prioritize evidence.',
  },
  {
    title: 'Review',
    prompt: 'Do you have an NCRP (cybercrime.gov.in) acknowledgement number?',
    hint: 'Optional — 14 digits if you filed a cybercrime complaint.',
  },
] as const;

export function GuidedIntakeForm({ onComplete, submitting, prefill }: GuidedIntakeFormProps) {
  const [step, setStep] = useState(0);
  const [narration, setNarration] = useState('');
  const [userRole, setUserRole] = useState<'sender' | 'receiver' | null>(null);
  const [recognizesFunds, setRecognizesFunds] = useState<'yes' | 'no' | null>(null);
  const [amountInr, setAmountInr] = useState(
    prefill?.frozenAmountPaise ? String(Math.round(prefill.frozenAmountPaise / 100)) : '',
  );
  const [ncrpId, setNcrpId] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const stepPanelRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  useEffect(() => {
    stepPanelRef.current?.focus();
  }, [step]);

  const narrationTooShort = narration.trim().length > 0 && narration.trim().length < MIN_NARRATION_LENGTH;
  const ncrpInvalid = ncrpId.trim().length > 0 && !/^\d{14}$/.test(ncrpId.trim());

  const canAdvance =
    (step === 0 && narration.trim().length >= MIN_NARRATION_LENGTH) ||
    (step === 1 && userRole !== null) ||
    (step === 2 && recognizesFunds !== null) ||
    step === 3 ||
    step === 4;

  function buildResult(aiConsentAccepted: boolean): GuidedIntakeResult {
    const amount = Number(amountInr);
    const hasAmount = Number.isFinite(amount) && amount > 0;

    const intakeJson: Record<string, unknown> = {
      source: 'guided_intake',
      narration,
      user_role: userRole ?? 'receiver',
      admits_unknown_funds: recognizesFunds === 'no',
    };
    if (hasAmount) intakeJson.amount_inr = amount;
    if (/^\d{14}$/.test(ncrpId.trim())) intakeJson.ncrp_id = ncrpId.trim();

    return {
      intakeJson,
      victimRole: userRole === 'sender' ? 'victim' : 'innocent_receiver',
      frozenAmountPaise: hasAmount ? Math.round(amount * 100) : undefined,
      aiConsentAccepted,
    };
  }

  function goNext() {
    setStepError(null);
    if (!canAdvance) {
      if (step === 0) {
        setStepError(
          narration.trim().length === 0
            ? 'Please describe what happened before continuing.'
            : `Add a few more details — at least ${MIN_NARRATION_LENGTH} characters.`,
        );
      } else if (step === 1) {
        setStepError('Please select which situation applies to you.');
      } else if (step === 2) {
        setStepError('Please tell us whether you recognize the frozen funds.');
      }
      return;
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  const meta = STEP_META[step];

  return (
    <div className="space-y-5">
      <div className="u-card animate-fade-in overflow-hidden p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge tone="forest" className="gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            ✦ Guided intake
          </Badge>
          <span aria-live="polite" className="type-mono-data text-ink-faint">
            {step + 1} / {TOTAL_STEPS}
          </span>
        </div>

        <div
          className="mt-3 flex gap-1"
          role="progressbar"
          aria-valuenow={step + 1}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
          aria-label={`Intake progress: step ${step + 1} of ${TOTAL_STEPS}`}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 3,
                background: i <= step ? '#3684c8' : '#dcdad3',
              }}
            />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--ink)]">{meta.title}</span>
          <span className="text-xs text-[var(--ink-muted)]">You stay in control</span>
        </div>
      </div>

      <div
        key={step}
        ref={stepPanelRef}
        tabIndex={-1}
        role="group"
        aria-labelledby={`${formId}-step-title`}
        aria-describedby={`${formId}-step-hint`}
        className="u-card animate-slide-in p-5 outline-none focus-visible:shadow-[var(--shadow-glow)] sm:p-6"
      >
        <h2 id={`${formId}-step-title`} className="type-display text-xl">
          {meta.title}
        </h2>
        <p className="type-lead mt-2 text-[0.9375rem]">{meta.prompt}</p>
        <p id={`${formId}-step-hint`} className="type-caption mt-1">
          {meta.hint}
        </p>

        <div className="mt-4">
          {step === 0 ? (
            <label className="block">
              <span className="sr-only">{meta.prompt}</span>
              <textarea
                aria-invalid={narrationTooShort}
                aria-describedby={narrationTooShort ? `${formId}-narration-error` : undefined}
                className="u-input mt-2 min-h-[120px] resize-y p-3"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="e.g. My SBI account got frozen after a UPI payment I received from someone I don't know…"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-[var(--ink-faint)]">
                <span className="font-mono">{narration.trim().length} chars</span>
                {narrationTooShort ? (
                  <span id={`${formId}-narration-error`} className="text-[var(--warn)]">
                    Add a bit more detail ({MIN_NARRATION_LENGTH}+ characters)
                  </span>
                ) : null}
              </div>
            </label>
          ) : null}

          {step === 1 ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">{meta.prompt}</legend>
              <RadioOption
                name="user_role"
                label="I sent the money and now my account is frozen"
                checked={userRole === 'sender'}
                onChange={() => setUserRole('sender')}
              />
              <RadioOption
                name="user_role"
                label="Money I didn't expect came in and now it's frozen"
                checked={userRole === 'receiver'}
                onChange={() => setUserRole('receiver')}
              />
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="space-y-2">
              <legend className="sr-only">{meta.prompt}</legend>
              <RadioOption
                name="recognizes_funds"
                label="Yes, I recognize all of it"
                checked={recognizesFunds === 'yes'}
                onChange={() => setRecognizesFunds('yes')}
              />
              <RadioOption
                name="recognizes_funds"
                label="No — some of it isn't familiar to me"
                checked={recognizesFunds === 'no'}
                onChange={() => setRecognizesFunds('no')}
              />
            </fieldset>
          ) : null}

          {step === 3 ? (
            <label className="block">
              <span className="sr-only">{meta.prompt}</span>
              <div className="relative mt-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-sm text-[var(--ink-faint)]">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  className="u-input py-2 pl-7 pr-3"
                  value={amountInr}
                  onChange={(e) => setAmountInr(e.target.value)}
                  placeholder="e.g. 25000"
                />
              </div>
              <span className="mt-1 block text-xs text-[var(--ink-faint)]">Leave blank if you are not sure yet.</span>
            </label>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <label className="block">
                <span className="sr-only">{meta.prompt}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-invalid={ncrpInvalid}
                  aria-describedby={ncrpInvalid ? `${formId}-ncrp-error` : undefined}
                  className="u-input mt-1 font-mono tracking-wide"
                  value={ncrpId}
                  onChange={(e) => setNcrpId(e.target.value)}
                  placeholder="14-digit acknowledgement number"
                />
                {ncrpInvalid ? (
                  <span id={`${formId}-ncrp-error`} className="mt-1 block text-xs text-[var(--warn)]">
                    NCRP numbers are 14 digits — we&apos;ll skip this for now if it doesn&apos;t match.
                  </span>
                ) : null}
              </label>

              <IntakeRecap
                narration={narration}
                userRole={userRole}
                recognizesFunds={recognizesFunds}
                amountInr={amountInr}
                ncrpId={ncrpId}
              />
            </div>
          ) : null}
        </div>

        {stepError ? (
          <p role="alert" className="u-alert u-alert-error mt-4">
            {stepError}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button
          variant="ghost"
          onClick={() => {
            setStepError(null);
            setStep((s) => Math.max(0, s - 1));
          }}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>

        {step < TOTAL_STEPS - 1 ? (
          <Button variant="secondary" onClick={goNext} disabled={submitting} className="gap-1">
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="primary" onClick={() => setShowDisclaimer(true)} disabled={submitting}>
            {submitting ? 'Starting…' : 'Review & start my case'}
          </Button>
        )}
      </div>

      <p className="type-caption text-center">
        Nothing is sent to your bank automatically. You review every letter before it goes out.
      </p>

      <DisclaimerModal
        open={showDisclaimer}
        onDecline={() => setShowDisclaimer(false)}
        onAccept={async (aiConsentAccepted) => {
          setShowDisclaimer(false);
          await onComplete(buildResult(aiConsentAccepted));
        }}
      />
    </div>
  );
}

function IntakeRecap({
  narration,
  userRole,
  recognizesFunds,
  amountInr,
  ncrpId,
}: {
  narration: string;
  userRole: 'sender' | 'receiver' | null;
  recognizesFunds: 'yes' | 'no' | null;
  amountInr: string;
  ncrpId: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--paper)] p-4 text-sm text-[var(--ink-muted)]">
      <p className="type-display text-base font-medium">Here&apos;s what you&apos;ve told us</p>
      <dl className="mt-3 space-y-3">
        <div>
          <dt className="type-eyebrow text-ink-faint">Your story</dt>
          <dd className="mt-1 text-[var(--ink)]">&ldquo;{narration.trim()}&rdquo;</dd>
        </div>
        <div>
          <dt className="type-eyebrow text-ink-faint">Situation</dt>
          <dd className="mt-0.5">
            {userRole === 'sender'
              ? 'You sent the money and your account is frozen.'
              : "Money you didn't expect came in and is now frozen."}
          </dd>
        </div>
        <div>
          <dt className="type-eyebrow text-ink-faint">Fund recognition</dt>
          <dd className="mt-0.5">
            {recognizesFunds === 'no'
              ? "You don't recognize all of the frozen funds."
              : 'You recognize where the frozen funds came from.'}
          </dd>
        </div>
        {amountInr.trim() ? (
          <div>
            <dt className="type-eyebrow text-ink-faint">Approximate amount</dt>
            <dd className="mt-0.5">₹{Number(amountInr).toLocaleString('en-IN')}</dd>
          </div>
        ) : null}
        {/^\d{14}$/.test(ncrpId.trim()) ? (
          <div>
            <dt className="type-eyebrow text-ink-faint">NCRP acknowledgement</dt>
            <dd className="type-mono-data mt-0.5 text-forest">{ncrpId.trim()}</dd>
          </div>
        ) : null}
      </dl>
      <p className="mt-3 text-xs text-[var(--ink-faint)]">
        Our AI will use these answers to help classify and route your case — a human always reviews anything
        before it&apos;s acted on.
      </p>
    </div>
  );
}

function RadioOption({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className={cn('u-radio', checked && 'u-radio-selected')}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[var(--forest)]"
      />
      <span className="text-[var(--ink)]">{label}</span>
    </label>
  );
}