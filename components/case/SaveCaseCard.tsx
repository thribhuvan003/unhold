'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/ui/cn';

type SaveCaseCardProps = {
  caseId: string;
  publicId: string;
  recoveryCode?: string | null;
  /** Compact row under case header (no recovery code). */
  compact?: boolean;
  className?: string;
};

function caseUrl(caseId: string): string {
  if (typeof window === 'undefined') return `/cases/${caseId}`;
  return `${window.location.origin}/cases/${caseId}`;
}

/** Case code + optional one-time recovery secret + copy helpers. */
export function SaveCaseCard({
  caseId,
  publicId,
  recoveryCode,
  compact = false,
  className,
}: SaveCaseCardProps) {
  const t = useTranslations('SaveCasePage');
  const smsRecoveryEnabled = process.env.NEXT_PUBLIC_ENABLE_SMS_RECOVERY === 'true';
  const [copied, setCopied] = useState<'code' | 'recovery' | 'link' | null>(null);
  const [smsPhone, setSmsPhone] = useState('');
  const [smsState, setSmsState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [smsError, setSmsError] = useState<string | null>(null);

  async function copy(kind: 'code' | 'recovery' | 'link', value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard may be denied; user can still select text.
    }
  }

  async function sendRecoverySms() {
    if (!recoveryCode || smsState === 'sending') return;
    setSmsState('sending');
    setSmsError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/recovery-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: smsPhone,
          recovery_code: recoveryCode,
          public_id: publicId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message ?? t('smsError'));
      }
      setSmsState('sent');
    } catch (err) {
      setSmsState('error');
      setSmsError(err instanceof Error ? err.message : t('smsError'));
    }
  }

  if (compact) {
    return (
      <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
        <span className="text-[var(--ink-faint)]">{t('caseCode')}</span>
        <span className="type-mono-data text-[var(--ink)]">{publicId}</span>
        <button
          type="button"
          onClick={() => copy('link', caseUrl(caseId))}
          className="min-h-[32px] rounded-lg border border-[var(--border)] px-2 font-semibold text-[var(--color-sky-deep)]"
        >
          {copied === 'link' ? t('copied') : t('copyLink')}
        </button>
      </div>
    );
  }

  return (
    <section data-testid="save-case" className={cn('u-card flex flex-col gap-3 p-4', className)}>
      <div>
        <p className="type-eyebrow">{t('eyebrow')}</p>
        <h1 className="type-display mt-2 text-xl text-[var(--ink)]">{t('title')}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--ink-muted)]">{t('body')}</p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
        <p className="text-xs font-semibold text-[var(--ink-faint)]">{t('caseCode')}</p>
        <p className="type-mono-data mt-1 text-lg text-[var(--ink)]">{publicId}</p>
        <button
          type="button"
          onClick={() => copy('code', publicId)}
          className="u-btn u-btn-ghost mt-2 min-h-[40px] w-full text-sm font-semibold"
        >
          {copied === 'code' ? t('copied') : t('copyCode')}
        </button>
      </div>

      {recoveryCode ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--saffron)]/40 bg-[var(--warn-muted)] px-3 py-3">
          <p className="text-xs font-semibold text-[var(--ink)]">{t('recoveryCode')}</p>
          <p className="type-mono-data mt-1 text-lg tracking-widest text-[var(--ink)]">{recoveryCode}</p>
          <p className="mt-1.5 text-xs leading-normal text-[var(--ink-muted)]">{t('recoveryHint')}</p>
          <button
            type="button"
            onClick={() => copy('recovery', recoveryCode)}
            className="u-btn u-btn-ghost mt-2 min-h-[40px] w-full text-sm font-semibold"
          >
            {copied === 'recovery' ? t('copied') : t('copyRecovery')}
          </button>

          {smsRecoveryEnabled ? (
            <div className="mt-3 border-t border-[var(--saffron)]/25 pt-3">
            <p className="text-xs font-semibold text-[var(--ink)]">{t('smsTitle')}</p>
            <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--ink-muted)]">{t('smsHint')}</p>
            <div className="relative mt-2">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[var(--ink-faint)]">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="u-input pl-12 font-mono"
                value={smsPhone}
                onChange={(e) => setSmsPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder={t('smsPlaceholder')}
              />
            </div>
            <button
              type="button"
              onClick={sendRecoverySms}
              disabled={smsState === 'sending' || smsPhone.length < 10 || smsState === 'sent'}
              className="u-btn u-btn-secondary mt-2 min-h-[40px] w-full text-sm font-semibold disabled:opacity-50"
            >
              {smsState === 'sending'
                ? t('smsSending')
                : smsState === 'sent'
                  ? t('smsSent')
                  : t('smsSend')}
            </button>
            {smsError ? (
              <p role="alert" className="mt-1.5 text-xs text-[var(--warn)]">
                {smsError}
              </p>
            ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs leading-relaxed text-[var(--ink-faint)]">{t('recoveryMissing')}</p>
      )}

      <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-3">
        <p className="text-xs font-semibold text-[var(--ink-faint)]">{t('linkLabel')}</p>
        <p className="mt-1 break-all text-xs text-[var(--color-sky-deep)]">{caseUrl(caseId)}</p>
        <button
          type="button"
          onClick={() => copy('link', caseUrl(caseId))}
          className="u-btn u-btn-ghost mt-2 min-h-[40px] w-full text-sm font-semibold"
        >
          {copied === 'link' ? t('copied') : t('copyLink')}
        </button>
      </div>

      <p className="text-xs leading-relaxed text-[var(--ink-muted)]">{t('warning')}</p>
    </section>
  );
}
