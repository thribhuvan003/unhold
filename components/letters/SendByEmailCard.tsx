'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Mail, Copy, Printer } from 'lucide-react';
import { cn } from '@/lib/ui/cn';
import { ProvenanceChip } from '@/components/ui/ProvenanceChip';

type SendByEmailCardProps = {
  subject: string;
  body: string;
  bankName: string;
  /** Approved + no missing fields + evidence ready + proof pack — sending unlocks. */
  canExport: boolean;
  /** Remind the user to attach the sealed PDF (never auto-attached). */
  showAttachReminder?: boolean;
  /** The bank's verified GENERAL complaint inbox (e.g. SBI customercare), if any. */
  initialEmail?: string;
  initialEmailNote?: string;
  verifiedDate?: string;
  /** Official page the fallback email was verified against (shown as proof). */
  verifiedSourceUrl?: string;
  /** Official complaint page for banks with no public email. */
  portal?: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Send-by-email card. The L1 grievance goes to the user's OWN branch — the
 * branch email is on their passbook/statement, is specific, and stays the same
 * even when the manager changes. That's more reliable than any guessed regional
 * email, so it's the primary path; the bank's verified general inbox is the
 * fallback.
 */
export function SendByEmailCard({
  subject,
  body,
  bankName,
  canExport,
  showAttachReminder = false,
  initialEmail,
  initialEmailNote,
  verifiedDate,
  verifiedSourceUrl,
  portal,
}: SendByEmailCardProps) {
  const t = useTranslations('SendByEmailCard');
  const [branchEmail, setBranchEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const branchOk = isValidEmail(branchEmail);
  const emailTo = branchOk ? branchEmail.trim() : (initialEmail ?? '');
  const hasEmail = !!emailTo;
  const usingBranch = branchOk;

  const mailtoHref = `mailto:${emailTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function handleOpenGmail() {
    const params = new URLSearchParams({ to: emailTo, su: subject, body });
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, '_blank', 'noopener,noreferrer');
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const win = window.open('', '_blank', 'noopener,width=800,height=1000');
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(subject)}</title><style>
        @page { size: A4; margin: 25mm 20mm; }
        body { font: 12pt/1.65 "Times New Roman", "Noto Serif", serif; color: #000; margin: 0; }
        .subject { font-weight: bold; margin-bottom: 1.5em; }
        pre { font: inherit; white-space: pre-wrap; margin: 0; }
      </style></head><body>
        <p class="subject">Subject: ${esc(subject)}</p>
        <pre>${esc(body)}</pre>
      </body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <section data-testid="send-by-email" className="u-card p-4">
      <p className="type-eyebrow">{t('eyebrow')}</p>

      {/* Branch email — the reliable primary target for the L1 letter. */}
      <label className="mt-3 block">
        <span className="text-[0.84375rem] font-semibold text-[var(--ink)]">
          {t('branchLabel')}
        </span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={branchEmail}
          onChange={(e) => setBranchEmail(e.target.value)}
          placeholder="e.g. sbi.01234@sbi.co.in"
          aria-label={t('branchAria')}
          className="u-input mt-1.5 font-mono"
        />
        <span className="mt-1.5 block text-xs leading-normal text-[var(--ink-faint)]">
          {t('branchHelp')}
        </span>
      </label>

      {hasEmail ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--surface)] pt-3">
          <span className="text-[0.78125rem] text-[var(--ink-muted)]">{t('to')}</span>
          <span className="type-mono-data break-all text-[0.78125rem] text-[var(--color-sky-deep)]">
            {emailTo}
          </span>
          {usingBranch ? (
            <span className="rounded-full bg-[var(--success-muted)] px-2 py-0.5 text-[0.65625rem] font-bold text-[var(--success)]">
              {t('yourBranch')}
            </span>
          ) : verifiedDate ? (
            <ProvenanceChip
              verifiedDate={verifiedDate}
              sourceUrl={verifiedSourceUrl}
              sourceLabel={t('officialPage', { bankName })}
            />
          ) : null}
        </div>
      ) : null}

      {!usingBranch && initialEmail ? (
        <p className="mt-1.5 text-xs leading-normal text-[var(--ink-faint)]">
          {t('fallbackNote', { bankName })} {initialEmailNote ?? t('fallbackDefault')}
        </p>
      ) : null}

      {!hasEmail ? (
        <p className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs leading-relaxed text-[var(--ink-muted)]">
          {t.rich('noEmailHelp', { strong: (chunks) => <strong>{chunks}</strong> })}
          {portal ? (
            <>
              {' '}
              {t.rich('portalSentence', {
                bankName,
                link: (chunks) => (
                  <a
                    href={portal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-[var(--color-sky-deep)]"
                  >
                    {chunks}
                  </a>
                ),
              })}
            </>
          ) : null}
        </p>
      ) : null}

      {hasEmail ? (
        <>
          <a
            href={canExport ? mailtoHref : undefined}
            aria-disabled={!canExport}
            className={cn(
              'u-btn u-btn-primary mt-3 flex min-h-[50px] w-full items-center justify-center gap-2 text-[0.9375rem] font-semibold',
              !canExport && 'pointer-events-none opacity-50',
            )}
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t('openMail')}
          </a>
          <p className="mt-2 text-xs leading-normal text-[var(--ink-faint)]">
            {t('openMailHelp')}
          </p>
          <button
            type="button"
            onClick={handleOpenGmail}
            disabled={!canExport}
            className="u-btn u-btn-ghost mt-2 min-h-[44px] w-full text-sm font-semibold disabled:opacity-50"
          >
            {t('gmail')}
          </button>
        </>
      ) : null}

      <div className="mt-2 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!canExport}
          className={cn(
            'u-btn flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50',
            hasEmail ? 'u-btn-ghost' : 'u-btn-primary',
          )}
        >
          {copied ? (
            t('copied')
          ) : (
            <>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t('copy')}
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handlePrint}
          disabled={!canExport}
          className="u-btn u-btn-ghost flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          {t('print')}
        </button>
      </div>

      {!canExport ? (
        <p className="mt-2 rounded-[var(--radius-md)] border border-[var(--saffron)]/30 bg-[var(--warn-muted)] px-3 py-2 text-xs text-[var(--ink)]">
          {t.rich('unlock', { strong: (chunks) => <strong>{chunks}</strong> })}
        </p>
      ) : null}

      {canExport && showAttachReminder ? (
        <p className="mt-2 rounded-[var(--radius-md)] border border-[var(--color-sky)]/30 bg-[var(--color-sky-mist)] px-3 py-2 text-xs leading-relaxed text-[var(--ink)]">
          {t('attachReminder')}
        </p>
      ) : null}

      <p className="mt-2.5 border-t border-[var(--surface)] pt-2.5 text-[0.78125rem] leading-relaxed text-[var(--ink-muted)]">
        {t.rich('strongest', {
          strong: (chunks) => <strong className="text-[var(--ink)]">{chunks}</strong>,
        })}
      </p>
    </section>
  );
}
