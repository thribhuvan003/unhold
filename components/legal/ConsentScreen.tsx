'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/ui/cn';

type ConsentScreenProps = {
  onContinue: (aiConsentAccepted: boolean) => void;
  onBack: () => void;
};

/**
 * Full-screen consent shown once before intake (replaces the DisclaimerModal).
 * Blocks B and F are rendered verbatim from the disclaimers constants.
 */
export function ConsentScreen({ onContinue, onBack }: ConsentScreenProps) {
  const t = useTranslations('ConsentScreen');
  const [accepted, setAccepted] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  return (
    <div className="flex animate-fade-up flex-col gap-3.5">
      <button
        type="button"
        onClick={onBack}
        className="min-h-[44px] cursor-pointer self-start border-none bg-transparent p-0 text-sm font-medium text-[var(--ink-muted)]"
      >
        {t('back')}
      </button>

      <section className="u-card p-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-sky-mist)]">
            <Shield className="h-4 w-4 text-[var(--color-sky-deep)]" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <h1 className="type-display text-[1.375rem]">{t('title')}</h1>
        </div>

        <p className="mt-4 text-[0.84375rem] leading-relaxed text-[var(--ink-muted)]">{t('whatToExpect')}</p>
        <details className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--color-sky-deep)]">
            {t('readDataDetails')}
          </summary>
          <div className="mt-2 space-y-3 text-[0.8125rem] leading-relaxed text-[var(--ink-muted)]">
            <p>{t('intakeDisclaimer')}</p>
            <p>{t('aiProcessingDisclaimer')}</p>
          </div>
        </details>
        <ConsentRow
          id="consent-required"
          checked={accepted}
          onToggle={() => setAccepted((v) => !v)}
          optionalLabel={t('optional')}
        >
          {t('agreeRequired')}
        </ConsentRow>

        <ConsentRow
          id="consent-ai"
          checked={aiConsent}
          onToggle={() => setAiConsent((v) => !v)}
          optional
          optionalLabel={t('optional')}
        >
          {t('agreeAi')}
        </ConsentRow>
        <p className="mt-2 text-xs leading-relaxed text-[var(--ink-faint)]">{t('aiSkipNote')}</p>

        <button
          type="button"
          onClick={() => {
            if (accepted) onContinue(aiConsent);
          }}
          disabled={!accepted}
          aria-disabled={!accepted}
          className={cn(
            'mt-4 min-h-[50px] w-full rounded-[var(--radius-md)] border-none text-[0.9375rem] font-semibold text-white shadow-[0_2px_8px_rgba(79,163,212,0.28)] transition-colors',
            accepted
              ? 'cursor-pointer bg-[var(--color-sky)] hover:bg-[var(--color-sky-deep)]'
              : 'cursor-not-allowed bg-[var(--border-strong)]',
          )}
        >
          {t('continue')}
        </button>
      </section>
    </div>
  );
}

function ConsentRow({
  id,
  checked,
  onToggle,
  optional = false,
  optionalLabel,
  children,
}: {
  id: string;
  checked: boolean;
  onToggle: () => void;
  optional?: boolean;
  optionalLabel: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'mt-3 flex min-h-[44px] w-full cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3.5 text-left transition-colors',
        checked
          ? 'border-[var(--success)]/40 bg-[var(--success)]/8'
          : 'border-[var(--border-strong)] bg-[var(--surface-raised)]',
      )}
    >
      <input id={id} type="checkbox" checked={checked} onChange={onToggle} className="sr-only" />
      <span
        aria-hidden="true"
        className={cn(
          'mt-px flex h-5 w-5 flex-none items-center justify-center rounded-[5px] border text-[0.8125rem] font-bold text-white',
          checked
            ? 'border-[var(--success)] bg-[var(--success)]'
            : 'border-[var(--border-strong)] bg-[var(--surface-raised)]',
        )}
      >
        {checked ? '✓' : ''}
      </span>
      <span className="text-[0.84375rem] leading-relaxed text-[var(--ink)]">
        {children}
        {optional ? (
          <span className="ml-2 inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-2 py-px align-middle text-[0.65625rem] font-bold uppercase tracking-wide text-[var(--ink-faint)]">
            {optionalLabel}
          </span>
        ) : null}
      </span>
    </label>
  );
}
