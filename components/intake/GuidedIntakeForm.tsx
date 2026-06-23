'use client';

import { useState } from 'react';
import { DisclaimerModal } from '@/components/legal/DisclaimerModal';

export type GuidedIntakeResult = {
  intakeJson: Record<string, unknown>;
  victimRole: 'victim' | 'innocent_receiver';
  frozenAmountPaise?: number;
  aiConsentAccepted: boolean;
};

interface GuidedIntakeFormProps {
  onComplete: (result: GuidedIntakeResult) => Promise<void> | void;
  submitting: boolean;
}

const TOTAL_STEPS = 5;

export function GuidedIntakeForm({ onComplete, submitting }: GuidedIntakeFormProps) {
  const [step, setStep] = useState(0);
  const [narration, setNarration] = useState('');
  const [userRole, setUserRole] = useState<'sender' | 'receiver' | null>(null);
  const [recognizesFunds, setRecognizesFunds] = useState<'yes' | 'no' | null>(null);
  const [amountInr, setAmountInr] = useState('');
  const [ncrpId, setNcrpId] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const canAdvance =
    (step === 0 && narration.trim().length > 0) ||
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[#1F6B8A]">
        <span className="rounded-full bg-[#1F6B8A]/10 px-2 py-1">Guided intake</span>
        <span aria-live="polite" className="text-slate-500">
          Step {step + 1} of {TOTAL_STEPS}
        </span>
      </div>

      {step === 0 ? (
        <label className="block">
          <span className="block text-sm font-medium text-[#0B1F33]">
            Tell me about the freeze in your own words.
          </span>
          <textarea
            className="mt-2 min-h-[96px] w-full rounded border border-slate-300 p-3 text-sm"
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="e.g. My SBI account got frozen after a UPI payment I received from someone I don't know…"
          />
        </label>
      ) : null}

      {step === 1 ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[#0B1F33]">
            Did you send this money, or did it land in your account unexpectedly?
          </legend>
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
          <legend className="text-sm font-medium text-[#0B1F33]">
            Do you recognize where all the frozen money came from?
          </legend>
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
          <span className="block text-sm font-medium text-[#0B1F33]">
            Roughly how much money is frozen? (₹, optional)
          </span>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            className="mt-2 min-h-[44px] w-full rounded border border-slate-300 px-3"
            value={amountInr}
            onChange={(e) => setAmountInr(e.target.value)}
            placeholder="e.g. 25000"
          />
        </label>
      ) : null}

      {step === 4 ? (
        <label className="block">
          <span className="block text-sm font-medium text-[#0B1F33]">
            Do you have an NCRP (cybercrime.gov.in) acknowledgement number? (optional)
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="mt-2 min-h-[44px] w-full rounded border border-slate-300 px-3"
            value={ncrpId}
            onChange={(e) => setNcrpId(e.target.value)}
            placeholder="14-digit acknowledgement number"
          />
          {ncrpId.trim().length > 0 && !/^\d{14}$/.test(ncrpId.trim()) ? (
            <span className="mt-1 block text-xs text-amber-700">
              NCRP numbers are 14 digits — we&apos;ll skip this for now if it doesn&apos;t match.
            </span>
          ) : null}
        </label>
      ) : null}

      {step === 4 ? (
        <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-medium text-[#0B1F33]">Here&apos;s what you&apos;ve told us:</p>
          <ul className="mt-2 space-y-1">
            <li>&quot;{narration.trim()}&quot;</li>
            <li>
              {userRole === 'sender'
                ? 'You sent the money and your account is frozen.'
                : "Money you didn't expect came in and is now frozen."}
            </li>
            <li>
              {recognizesFunds === 'no'
                ? "You don't recognize all of the frozen funds."
                : 'You recognize where the frozen funds came from.'}
            </li>
            {amountInr.trim() ? <li>Approximate amount: ₹{amountInr.trim()}</li> : null}
            {/^\d{14}$/.test(ncrpId.trim()) ? <li>NCRP acknowledgement: {ncrpId.trim()}</li> : null}
          </ul>
          <p className="mt-2 text-xs text-slate-500">
            Once you start your case, our AI will use these answers to help classify and route it — a human always
            reviews anything before it&apos;s acted on.
          </p>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || submitting}
          className="min-h-[44px] rounded px-4 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          Back
        </button>

        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1))}
            disabled={!canAdvance || submitting}
            className="min-h-[44px] rounded bg-[#1F6B8A] px-5 font-medium text-white disabled:opacity-60"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowDisclaimer(true)}
            disabled={submitting}
            className="min-h-[44px] rounded bg-[#1F6B8A] px-5 font-medium text-white disabled:opacity-60"
          >
            {submitting ? 'Starting…' : 'Review & start my case'}
          </button>
        )}
      </div>

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
    <label className="flex min-h-[44px] items-center gap-2 rounded border border-slate-300 px-3 text-sm">
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
