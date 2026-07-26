'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, ExternalLink, Printer } from 'lucide-react';
import {
  buildIoNocLetter,
  CYBERCRIME_CITIZEN_PORTAL_URL,
  type IoNocValues,
} from '@/lib/letters/io-noc-template';
import { cn } from '@/lib/ui/cn';

export type AuthorityLetterFields = {
  userName: string;
  userAddress: string;
  userPhone: string;
  bankName: string;
  accountLast4: string;
  amountInr: string;
  freezeDate: string;
  ncrpId: string;
  policeStation: string;
};

type AuthorityActionsCardProps = {
  /** When false (branch/court/tax), this card is not the primary path — still hidden by parent. */
  l1Sent: boolean;
  fields: AuthorityLetterFields;
};

/**
 * Cyber-track authority actions the bank ladder cannot replace:
 * 1) Official citizen NCRP/cybercrime entry point
 * 2) Ready-to-copy representation to the authority identified by the bank
 *
 * You still send everything yourself — Unhold never contacts police or government systems.
 */
export function AuthorityActionsCard({ l1Sent, fields }: AuthorityActionsCardProps) {
  const t = useTranslations('AuthorityActionsCard');
  const [copied, setCopied] = useState(false);
  const [showLetter, setShowLetter] = useState(false);

  const letter = useMemo(() => {
    const values: IoNocValues = {
      USER_NAME: fields.userName,
      USER_ADDRESS: fields.userAddress,
      USER_PHONE: fields.userPhone,
      BANK_NAME: fields.bankName,
      ACCOUNT_LAST4: fields.accountLast4,
      AMOUNT_INR: fields.amountInr,
      FREEZE_DATE: fields.freezeDate,
      NCRP_ID: fields.ncrpId,
      POLICE_STATION: fields.policeStation,
    };
    return buildIoNocLetter(values);
  }, [fields]);

  async function handleCopy() {
    await navigator.clipboard.writeText(`Subject: ${letter.subject}\n\n${letter.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    const esc = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const win = window.open('', '_blank', 'noopener,width=800,height=1000');
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><meta charset="utf-8"><title>${esc(letter.subject)}</title><style>
        @page { size: A4; margin: 25mm 20mm; }
        body { font: 12pt/1.65 "Times New Roman", "Noto Serif", serif; color: #000; margin: 0; }
        .subject { font-weight: bold; margin-bottom: 1.5em; }
        pre { font: inherit; white-space: pre-wrap; margin: 0; }
      </style></head><body>
        <p class="subject">Subject: ${esc(letter.subject)}</p>
        <pre>${esc(letter.body)}</pre>
      </body></html>`,
    );
    win.document.close();
    win.focus();
    win.print();
  }

  return (
    <section
      id="authority-actions"
      data-testid="authority-actions"
      className="u-card scroll-mt-20 p-4"
    >
      <p className="type-eyebrow">{t('eyebrow')}</p>
      <h2 className="type-display mt-1.5 text-lg text-[var(--ink)]">{t('title')}</h2>
      <p className="mt-2 text-[0.84375rem] leading-relaxed text-[var(--ink-muted)]">{t('intro')}</p>

      {/* Public citizen entry point — never link a citizen to the staff-only CFCFRMS login. */}
      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--color-sky)]/30 bg-[var(--color-sky-mist)] px-3.5 py-3">
        <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">{t('grmTitle')}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">{t('grmBody')}</p>
        <a
          href={CYBERCRIME_CITIZEN_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="u-btn u-btn-secondary mt-2.5 flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold no-underline"
        >
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t('grmCta')}
        </a>
      </div>

      {/* Authority representation */}
      <div className="mt-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
        <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">{t('ioTitle')}</p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
          {l1Sent ? t('ioBodyReady') : t('ioBodyEarly')}
        </p>
        {!l1Sent ? (
          <p className="mt-2 text-xs font-medium text-[var(--saffron-deep,#b45309)]">{t('ioHintEarly')}</p>
        ) : null}

        <button
          type="button"
          onClick={() => setShowLetter((v) => !v)}
          className="u-btn u-btn-primary mt-2.5 flex min-h-[44px] w-full text-sm font-semibold"
        >
          {showLetter ? t('hideLetter') : t('showLetter')}
        </button>

        {showLetter ? (
          <div className="animate-fade-up mt-3">
            <p className="text-xs font-semibold text-[var(--ink-faint)]">{t('subjectLabel')}</p>
            <p className="mt-1 text-[0.8125rem] font-medium leading-snug text-[var(--ink)]">
              {letter.subject}
            </p>
            <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 font-serif text-[0.78125rem] leading-relaxed text-[var(--ink)]">
              {letter.body}
            </pre>
            <div className="mt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="u-btn u-btn-ghost flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? t('copied') : t('copy')}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className={cn(
                  'u-btn flex min-h-[44px] w-full items-center justify-center gap-2 text-sm font-semibold',
                  'u-btn-ghost',
                )}
              >
                <Printer className="h-4 w-4" aria-hidden="true" />
                {t('print')}
              </button>
            </div>
            <p className="mt-2 text-[0.71875rem] leading-relaxed text-[var(--ink-faint)]">
              {t('youSend')}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
