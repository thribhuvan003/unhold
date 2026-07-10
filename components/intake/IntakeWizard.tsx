'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/ui/cn';

type DbFreezeReason = 'cyber_upi_chain' | 'court_order' | 'tax_gst_attachment' | 'kyc_expired';

export type IntakeWizardResult = {
  intakeJson: Record<string, unknown>;
  victimRole: 'victim' | 'innocent_receiver';
  frozenAmountPaise?: number;
  /** null = user picked "Other / not sure" — caller stores a provisional slug, never shown to the user. */
  bankSlug: string | null;
  bankName: string | null;
  freezeType: 'total_freeze' | 'partial_lien' | 'debit_freeze' | null;
  /** Who ordered the freeze — drives the whole unfreeze-path/letter branching.
   *  undefined = "not sure" (a later classifier may still set it). */
  freezeReason?: DbFreezeReason;
};

// Bank names are proper nouns shown in Latin on the banks' own branding, so they
// stay untranslated; the "Other" row's label comes from the catalog.
const BANK_OPTIONS = [
  { choice: 'sbi', slug: 'state-bank-of-india', name: 'State Bank of India (SBI)' },
  { choice: 'hdfc', slug: 'hdfc-bank', name: 'HDFC Bank' },
  { choice: 'icici', slug: 'icici-bank', name: 'ICICI Bank' },
  { choice: 'axis', slug: 'axis-bank', name: 'Axis Bank' },
  { choice: 'other', slug: null, name: null },
] as const;

type BankChoice = (typeof BANK_OPTIONS)[number]['choice'];
type RoleChoice = 'sender' | 'receiver' | 'unsure';
type FreezeChoice = 'full' | 'lien' | 'debit' | 'unsure';
type ReasonChoice = 'cyber' | 'court' | 'tax' | 'kyc' | 'unsure';

const ROLE_VALUES: RoleChoice[] = ['sender', 'receiver', 'unsure'];

const REASON_OPTIONS: { value: ReasonChoice; dbValue: DbFreezeReason | null }[] = [
  { value: 'cyber', dbValue: 'cyber_upi_chain' },
  { value: 'court', dbValue: 'court_order' },
  { value: 'tax', dbValue: 'tax_gst_attachment' },
  { value: 'kyc', dbValue: 'kyc_expired' },
  { value: 'unsure', dbValue: null },
];

const FREEZE_OPTIONS: {
  value: FreezeChoice;
  // Bank terminology, shown verbatim in the "bank calls this" chip.
  term?: string;
  dbValue: 'total_freeze' | 'partial_lien' | 'debit_freeze' | null;
}[] = [
  { value: 'full', dbValue: 'total_freeze' },
  { value: 'lien', term: 'lien', dbValue: 'partial_lien' },
  { value: 'debit', term: 'debit freeze', dbValue: 'debit_freeze' },
  { value: 'unsure', dbValue: null },
];

const TOTAL_STEPS = 6;
const MIN_STORY_LENGTH = 10;
const MAX_STORY_LENGTH = 4000;
const MAX_AMOUNT_INR = 1_000_000_000; // ₹100 crore — blocks absurd/exponent values.

/** A real 14-digit NCRP acknowledgement number, not a filler like 00000000000000. */
function isValidNcrp(value: string): boolean {
  const v = value.trim();
  return /^\d{14}$/.test(v) && !/^(\d)\1{13}$/.test(v);
}

interface IntakeWizardProps {
  onComplete: (result: IntakeWizardResult) => Promise<void> | void;
  submitting: boolean;
  /** Back from the first question (prototype returns to Home). */
  onExit: () => void;
}

export function IntakeWizard({ onComplete, submitting, onExit }: IntakeWizardProps) {
  const t = useTranslations('IntakeWizard');
  const stepMeta = t.raw('steps') as { title: string; hint: string }[];
  const stepErrors = t.raw('errors') as string[];

  const [step, setStep] = useState(0);
  const [story, setStory] = useState('');
  const [bankChoice, setBankChoice] = useState<BankChoice | null>(null);
  const [role, setRole] = useState<RoleChoice | null>(null);
  const [freezeChoice, setFreezeChoice] = useState<FreezeChoice | null>(null);
  const [reasonChoice, setReasonChoice] = useState<ReasonChoice | null>(null);
  const [amountInr, setAmountInr] = useState('');
  const [ncrpId, setNcrpId] = useState('');
  const [stepError, setStepError] = useState<string | null>(null);

  const stepPanelRef = useRef<HTMLDivElement>(null);
  const formId = useId();

  useEffect(() => {
    stepPanelRef.current?.focus();
  }, [step]);

  const storyLen = story.trim().length;
  const ncrpInvalid = ncrpId.trim().length > 0 && !isValidNcrp(ncrpId);

  const canAdvance =
    (step === 0 && storyLen >= MIN_STORY_LENGTH) ||
    (step === 1 && bankChoice !== null) ||
    (step === 2 && role !== null) ||
    (step === 3 && freezeChoice !== null) ||
    step === 4 ||
    (step === 5 && reasonChoice !== null);

  function buildResult(): IntakeWizardResult {
    const amount = Math.min(Number(amountInr), MAX_AMOUNT_INR);
    const hasAmount = Number.isFinite(amount) && amount > 0;

    const bank = BANK_OPTIONS.find((b) => b.choice === bankChoice) ?? null;
    const freeze = FREEZE_OPTIONS.find((f) => f.value === freezeChoice) ?? null;
    const reason = REASON_OPTIONS.find((r) => r.value === reasonChoice) ?? null;

    const intakeJson: Record<string, unknown> = {
      source: 'guided_intake',
      // Trim + cap the free-text story before it's stored / sent to the LLM.
      narration: story.trim().slice(0, MAX_STORY_LENGTH),
      user_role: role ?? 'receiver',
      user_role_uncertain: role === 'unsure',
      bank_unconfirmed: !bank?.slug,
    };
    if (bank?.slug) {
      intakeJson.bank_slug_selected = bank.slug;
      intakeJson.bank_name = bank.name;
    }
    if (freeze?.dbValue) intakeJson.freeze_type_hint = freeze.dbValue;
    intakeJson.freeze_type_uncertain = freezeChoice === 'unsure';
    intakeJson.freeze_reason_uncertain = reasonChoice === 'unsure' || reasonChoice === null;
    if (hasAmount) intakeJson.amount_inr = amount;
    if (isValidNcrp(ncrpId)) intakeJson.ncrp_id = ncrpId.trim();
    // Tiny unknown UPI credits that freeze the whole account — product path flag.
    if (hasAmount && amount > 0 && amount <= 5000) {
      intakeJson.micro_upi_pattern = true;
      intakeJson.disproportionate_freeze_likely = true;
    }

    return {
      intakeJson,
      victimRole: role === 'sender' ? 'victim' : 'innocent_receiver',
      frozenAmountPaise: hasAmount ? Math.round(amount * 100) : undefined,
      bankSlug: bank?.slug ?? null,
      bankName: bank?.name ?? null,
      freezeType: freeze?.dbValue ?? null,
      freezeReason: reason?.dbValue ?? undefined,
    };
  }

  function goNext() {
    if (!canAdvance) {
      const message =
        step === 0 ? (storyLen === 0 ? stepErrors[0] : t('errorStoryMore')) : stepErrors[step];
      setStepError(message || null);
      return;
    }
    setStepError(null);
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function goBack() {
    setStepError(null);
    if (step === 0) onExit();
    else setStep((s) => s - 1);
  }

  const meta = stepMeta[step];

  return (
    <div className="flex animate-fade-up flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={submitting}
          className="min-h-[44px] cursor-pointer border-none bg-transparent py-0 pl-0 pr-2 text-sm font-medium text-[var(--ink-muted)]"
        >
          {t('back')}
        </button>
        <span aria-live="polite" className="type-mono-data text-[0.8125rem] text-ink-faint">
          {t('progress', { current: step + 1, total: TOTAL_STEPS })}
        </span>
      </div>

      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={step + 1}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={t('progressLabel', { current: step + 1, total: TOTAL_STEPS })}
      >
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i).map((i) => (
          <div
            key={i}
            style={{ flex: 1, height: 5, borderRadius: 3, background: i <= step ? 'var(--color-sky-deep)' : '#dcdad3' }}
          />
        ))}
      </div>

      <div
        key={step}
        ref={stepPanelRef}
        tabIndex={-1}
        role="group"
        aria-labelledby={`${formId}-step-title`}
        aria-describedby={`${formId}-step-hint`}
        className="u-card animate-slide-in p-5 outline-none focus-visible:shadow-[var(--shadow-glow)]"
      >
        <h2 id={`${formId}-step-title`} className="type-display text-[1.3125rem]">
          {meta.title}
        </h2>
        <p id={`${formId}-step-hint`} className="mt-1.5 text-[0.8125rem] leading-normal text-[var(--ink-faint)]">
          {meta.hint}
        </p>

        <div className="mt-4">
          {step === 0 ? (
            <label className="block">
              <span className="sr-only">{meta.title}</span>
              <textarea
                className="u-input min-h-[130px] resize-y p-3 text-[0.9375rem]"
                value={story}
                maxLength={MAX_STORY_LENGTH}
                onChange={(e) => {
                  setStory(e.target.value);
                  setStepError(null);
                }}
                placeholder={t('storyPlaceholder')}
              />
              <p className="type-mono-data mt-1.5 text-xs text-ink-faint">
                {t('storyCounter', { count: storyLen })}
              </p>
            </label>
          ) : null}

          {step === 1 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{meta.title}</legend>
              {BANK_OPTIONS.map((b) => (
                <RadioOption
                  key={b.choice}
                  name="bank_choice"
                  label={b.name ?? t('bankOtherLabel')}
                  checked={bankChoice === b.choice}
                  onChange={() => {
                    setBankChoice(b.choice);
                    setStepError(null);
                  }}
                />
              ))}
            </fieldset>
          ) : null}

          {step === 2 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{meta.title}</legend>
              {ROLE_VALUES.map((value) => (
                <RadioOption
                  key={value}
                  name="user_role"
                  label={t(`roleOptions.${value}`)}
                  checked={role === value}
                  onChange={() => {
                    setRole(value);
                    setStepError(null);
                  }}
                />
              ))}
            </fieldset>
          ) : null}

          {step === 3 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{meta.title}</legend>
              {FREEZE_OPTIONS.map((o) => (
                <div key={o.value}>
                  <RadioOption
                    name="freeze_choice"
                    label={t(`freezeOptions.${o.value}.label`)}
                    checked={freezeChoice === o.value}
                    onChange={() => {
                      setFreezeChoice(o.value);
                      setStepError(null);
                    }}
                  />
                  {freezeChoice === o.value ? (
                    <p className="mb-0.5 mt-1.5 pl-7 text-[0.78125rem] leading-normal text-[var(--ink-faint)]">
                      {t(`freezeOptions.${o.value}.help`)}{' '}
                      {o.term ? (
                        <span className="inline-block rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 text-[0.6875rem] text-[var(--ink-muted)]">
                          {t('bankCallsThis', { term: o.term })}
                        </span>
                      ) : null}
                    </p>
                  ) : null}
                </div>
              ))}
            </fieldset>
          ) : null}

          {step === 4 ? (
            <div className="flex flex-col gap-3.5">
              <label className="block">
                <span className="sr-only">{meta.title}</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-display text-sm text-[var(--ink-faint)]">
                    ₹
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={13}
                    autoComplete="off"
                    className="u-input py-2 pl-7 pr-3 text-[0.9375rem]"
                    value={amountInr}
                    // Strip ₹, commas and spaces so a pasted "₹1,00,000" is kept,
                    // not silently dropped by a number input.
                    onChange={(e) => setAmountInr(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder={t('amountPlaceholder')}
                  />
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {/* Micro-UPI / Bangalore-style tiny credit freezes — common real path */}
                  <button
                    type="button"
                    onClick={() => {
                      setAmountInr('2');
                      setStepError(null);
                    }}
                    className="cursor-pointer rounded-full border border-[var(--saffron)]/40 bg-[var(--warn-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
                  >
                    {t('microUpiChip')}
                  </button>
                  {[1800, 10000, 50000, 100000].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAmountInr(String(v))}
                      className="cursor-pointer rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
                    >
                      ₹{v.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
                <span className="mt-2 block text-xs leading-normal text-[var(--ink-faint)]">
                  {t('amountHint')}
                </span>
              </label>

              <label className="block">
                <span className="text-[0.84375rem] font-semibold text-[var(--ink)]">
                  {t('ncrpLabel')}{' '}
                  <span className="font-normal text-[var(--ink-faint)]">{t('ncrpOptional')}</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  autoComplete="off"
                  aria-invalid={ncrpInvalid}
                  aria-describedby={ncrpInvalid ? `${formId}-ncrp-error` : undefined}
                  className="u-input mt-1.5 font-mono tracking-wide"
                  value={ncrpId}
                  onChange={(e) => setNcrpId(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={t('ncrpPlaceholder')}
                />
                {ncrpInvalid ? (
                  <span id={`${formId}-ncrp-error`} className="mt-1.5 block text-xs text-[var(--warn)]">
                    {t('ncrpInvalid')}
                  </span>
                ) : (
                  <span className="mt-1.5 block text-xs leading-normal text-[var(--ink-faint)]">
                    {t('ncrpSkip')}
                  </span>
                )}
              </label>
            </div>
          ) : null}

          {step === 5 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">{meta.title}</legend>
              {REASON_OPTIONS.map((o) => {
                const help = t(`reasonOptions.${o.value}.help`);
                return (
                  <div key={o.value}>
                    <RadioOption
                      name="freeze_reason"
                      label={t(`reasonOptions.${o.value}.label`)}
                      checked={reasonChoice === o.value}
                      onChange={() => {
                        setReasonChoice(o.value);
                        setStepError(null);
                      }}
                    />
                    {reasonChoice === o.value && help ? (
                      <p className="mb-0.5 mt-1.5 pl-7 text-[0.78125rem] leading-normal text-[var(--ink-faint)]">
                        {help}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </fieldset>
          ) : null}
        </div>

        {stepError ? (
          <p role="alert" className="u-alert u-alert-error mt-3.5">
            {stepError}
          </p>
        ) : null}
      </div>

      <div className="flex justify-end gap-2.5">
        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={submitting}
            className="u-btn u-btn-secondary min-h-[48px] px-6 text-[0.9375rem] font-semibold"
          >
            {t('next')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onComplete(buildResult())}
            disabled={submitting}
            className="u-btn u-btn-primary min-h-[48px] px-6 text-[0.9375rem] font-semibold"
          >
            {submitting ? t('starting') : t('startCase')}
          </button>
        )}
      </div>

      <p className="text-center text-xs leading-normal text-[var(--ink-faint)]">
        {t('footerNote')}
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
    <label className={cn('u-radio min-h-[48px]', checked && 'u-radio-selected')}>
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
