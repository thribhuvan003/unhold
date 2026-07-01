'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink, Mail, Send } from 'lucide-react';
import { LETTER_DISCLAIMER } from '@/lib/constants/disclaimers';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/ui/cn';

type LetterPreviewProps = {
  subject: string;
  body: string;
  level: string;
  placeholdersMissing: string[];
  approved?: boolean;
  recipientEmail?: string; // passed from bank contact finder
  onCopy?: () => void;
};

const LEVEL_PLAIN: Record<string, string> = {
  L1: 'First letter to your bank branch',
  L2: 'Escalation to nodal officer',
  L3: 'RBI Ombudsman complaint draft',
  L4: 'RTI / Court brief',
};

export function LetterPreview({
  subject,
  body,
  level,
  placeholdersMissing,
  approved = false,
  recipientEmail,
  onCopy,
}: LetterPreviewProps) {
  const canExport = approved && placeholdersMissing.length === 0;
  const [copied, setCopied] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);

  async function handleCopy() {
    if (!canExport) return;
    const text = `Subject: ${subject}\n\n${body}`;
    if (onCopy) {
      onCopy();
    } else {
      await navigator.clipboard.writeText(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleCopyEmail() {
    const text = `To: ${recipientEmail ?? '(verify with your branch)'}\nSubject: ${subject}\n\n${body}`;
    await navigator.clipboard.writeText(text);
    setEmailCopied(true);
    setTimeout(() => setEmailCopied(false), 2500);
  }

  function handleOpenGmail() {
    const params = new URLSearchParams({
      to: recipientEmail ?? '',
      su: subject,
      body: `${body}\n\nNote: Attach all listed Annexures before sending.`,
    });
    // Gmail compose URL — opens a draft, does NOT auto-send
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`, '_blank', 'noopener,noreferrer');
  }

  function handleMailto() {
    const params = new URLSearchParams({ subject, body: `${body}\n\n— Sent via Unhold (copy-only draft)` });
    window.location.href = `mailto:${recipientEmail ?? ''}?${params.toString()}`;
  }

  return (
    <article data-testid="letter-preview" className="animate-fade-up space-y-4">

      {/* Disclaimer banner */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="mt-0.5 flex-none text-base">⚠️</span>
        <p>
          <strong>Draft only — review before sending.</strong> Unhold does not send this letter for you.
          Read it carefully, fill any missing fields, and send it yourself via email or post.
        </p>
      </div>

      {/* Level badge */}
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[var(--forest-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--forest)]">
          {level} Letter
        </span>
        <span className="text-sm text-[var(--ink-muted)]">{LEVEL_PLAIN[level] ?? level}</span>
      </div>

      {/* Subject */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">Subject</p>
        <p className="mt-1 text-sm font-medium text-[var(--ink)]">{subject}</p>
      </div>

      {/* Missing placeholders warning */}
      {placeholdersMissing.length > 0 ? (
        <div className="rounded-lg border border-[var(--warn)]/30 bg-[var(--warn-muted)] px-4 py-3 text-sm text-[var(--ink)]">
          <p className="font-semibold">Fill these before sending:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-[var(--ink-muted)]">
            {placeholdersMissing.map((p) => (
              <li key={p}><code className="text-xs">{`{{${p}}}`}</code></li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Letter body */}
      <div className="rounded-xl border border-[var(--border)] bg-white">
        <pre className="overflow-x-auto whitespace-pre-wrap p-5 font-mono text-[0.8125rem] leading-relaxed text-[var(--ink)]">
          {body}
        </pre>
      </div>

      {/* SEND / EXPORT ACTIONS */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--ink-faint)]">
          Send this letter yourself — choose how
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">

          {/* Copy to clipboard */}
          <Button
            type="button"
            variant={canExport ? 'secondary' : 'ghost'}
            disabled={!canExport}
            onClick={handleCopy}
            className={cn('gap-2', !canExport && 'opacity-50')}
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy letter'}
          </Button>

          {/* Open in Gmail (draft — NOT auto-send) */}
          <Button
            type="button"
            variant={canExport ? 'secondary' : 'ghost'}
            disabled={!canExport}
            onClick={handleOpenGmail}
            className={cn('gap-2', !canExport && 'opacity-50')}
          >
            <Send className="h-4 w-4" />
            Open in Gmail
            <ExternalLink className="h-3.5 w-3.5 opacity-60" />
          </Button>

          {/* Open in default email client */}
          <Button
            type="button"
            variant={canExport ? 'secondary' : 'ghost'}
            disabled={!canExport}
            onClick={handleMailto}
            className={cn('gap-2', !canExport && 'opacity-50')}
          >
            <Mail className="h-4 w-4" />
            Open in mail app
          </Button>

          {/* Copy email draft (to: + subject + body) */}
          <Button
            type="button"
            variant="ghost"
            disabled={!canExport}
            onClick={handleCopyEmail}
            className={cn('gap-2 text-[var(--ink-muted)]', !canExport && 'opacity-50')}
          >
            {emailCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
            {emailCopied ? 'Email draft copied!' : 'Copy email draft'}
          </Button>
        </div>

        {!canExport ? (
          <p className="mt-2 text-xs text-[var(--ink-faint)]">
            {!approved
              ? 'Approve this draft to enable sending options.'
              : 'Fill all missing fields (shown above) to enable sending options.'}
          </p>
        ) : null}

        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          {LETTER_DISCLAIMER} Always attach the listed Annexures before sending.
        </p>
      </div>

      {/* Recipient note */}
      {recipientEmail ? (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="text-base">📧</span>
          <div>
            <p className="font-medium text-[var(--ink)]">Suggested recipient: {recipientEmail}</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Always verify this address directly with your bank branch before sending.
              Bank contacts change — this is sourced from official pages but may not be current.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm">
          <span className="text-base">📍</span>
          <p className="text-[var(--ink-muted)]">
            <strong className="text-[var(--ink)]">Who to send this to:</strong> Your home bank branch (in person or by registered post).
            Ask the branch for the grievance email or nodal officer contact if you want to send by email.
          </p>
        </div>
      )}
    </article>
  );
}
