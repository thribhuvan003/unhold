'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { computeSha256HexInBrowser } from '@/lib/evidence/sha256';
import { validateUploadFile } from '@/lib/evidence/validate-file';
import { classifyDoc, type DocClass } from '@/lib/evidence/readability';
import type { PaperDocDef } from '@/lib/intake/paper-display';

type PaperType = string;

type VerificationMismatch = { field: string; expected: string; found: string };

export type PaperVerification = {
  /** null = not auto-read yet (PDF or still analysing). */
  confidence: number | null;
  forgery: boolean;
  mismatches: VerificationMismatch[];
  humanReview: boolean;
  /** false = the file isn't a genuine freeze-evidence document (wrong/blank). */
  relevant?: boolean;
  /** what the file looked like, for a tailored "wrong document" message. */
  documentKind?: string | null;
} | null;

type RowState = {
  status: 'todo' | 'uploading' | 'checking' | 'done' | 'error';
  verification: PaperVerification;
  /** Poll exhausted without a verifier event — saved, still checking in background. */
  pending: boolean;
  error: string | null;
};

interface PapersChecklistProps {
  caseId: string;
  guestToken?: string;
  /** Papers already uploaded, with their latest automated-check result (null = unknown). */
  initialDocs: Partial<Record<PaperType, PaperVerification>>;
  /** sha256 of each already-uploaded paper, so a re-used file is caught across slots. */
  initialShas?: Partial<Record<PaperType, string>>;
  /** Show "bank calls this" chips. */
  officialTerms?: boolean;
  /** Core + optional papers, adapted to the freeze reason. Defaults to the
   * universal cyber set so callers/tests that don't pass them still work. */
  coreDocs?: PaperDocDef[];
  extraDocs?: PaperDocDef[];
  /** e.g. "Cyber / UPI fraud freeze" — a banner so the list reads case-specific. */
  reasonLabel?: string | null;
}

const DEFAULT_CORE_DOCS: PaperDocDef[] = [
  {
    type: 'freeze_sms',
    label: 'Freeze SMS or notice',
    why: 'Shows when and how the bank froze it. The starting point for any letter. AI also explains what it means.',
    term: 'freeze intimation',
    article: 'a',
    kindLabel: 'freeze SMS or notice',
  },
  {
    type: 'bank_statement',
    label: 'Bank statement',
    why: 'Shows the blocked amount and that your money came in honestly.',
    term: 'lien entry',
    article: 'a',
    kindLabel: 'bank statement',
  },
  {
    type: 'pan_card',
    label: 'PAN card — hide the middle numbers',
    why: 'Proves who you are to the bank.',
    term: 'masked PAN',
    article: 'a',
    kindLabel: 'PAN card',
  },
];

const DEFAULT_EXTRA_DOCS: PaperDocDef[] = [
  { type: 'ncrp_acknowledgement', label: 'Cybercrime complaint receipt (NCRP)', why: 'Links your case to the investigation.', article: 'an', kindLabel: 'NCRP receipt' },
  { type: 'police_fir', label: 'Police FIR copy', why: 'Shows the police record behind the freeze.', article: 'a', kindLabel: 'police FIR' },
  { type: 'chat_screenshot', label: 'Chat or payment screenshots', why: 'Shows the payment was genuine.', article: 'a', kindLabel: 'chat or payment screenshot' },
];

// Snappier feedback: the verify API itself is ~0.5s, so poll fast early. Total
// window stays ~60s (40 × 1.5s) before the calm background-check fallback.
const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 40;

function docClassOf(v: PaperVerification): DocClass | null {
  if (!v) return null;
  // Mirror the server's cap: an irrelevant file is unreadable regardless of the
  // raw confidence the model reported (the server stores it capped; the live
  // poll carries the raw number, so enforce it here too).
  if (v.relevant === false) return 'unreadable';
  return classifyDoc({ confidence: v.confidence, forgery: v.forgery, hasMismatch: v.mismatches.length > 0 });
}

/** A done row only counts toward "N of 3" / unlock when it is not unreadable. */
function rowCounts(row: RowState): boolean {
  if (row.status !== 'done') return false;
  if (row.pending) return true; // saved, still checking — trust it for now
  return docClassOf(row.verification) !== 'unreadable';
}

export function PapersChecklist({
  caseId,
  guestToken,
  initialDocs,
  initialShas,
  officialTerms = true,
  coreDocs = DEFAULT_CORE_DOCS,
  extraDocs = DEFAULT_EXTRA_DOCS,
  reasonLabel = null,
}: PapersChecklistProps) {
  const router = useRouter();
  const t = useTranslations('PapersChecklist');
  const labelFor = (type: string): string =>
    [...coreDocs, ...extraDocs].find((d) => d.type === type)?.label ?? type;
  const coreCount = coreDocs.length;
  const [rows, setRows] = useState<Record<PaperType, RowState>>(() => {
    const init = {} as Record<PaperType, RowState>;
    for (const t of [...coreDocs.map((d) => d.type), ...extraDocs.map((d) => d.type)]) {
      const uploaded = t in initialDocs;
      init[t] = {
        status: uploaded ? 'done' : 'todo',
        verification: uploaded ? (initialDocs[t] ?? null) : null,
        pending: uploaded ? (initialDocs[t] ?? null) === null : false,
        error: null,
      };
    }
    return init;
  });
  // sha256 → the slot it was used in, so the same file can't fill two slots.
  const usedShas = useRef<Map<string, PaperType>>(
    new Map(
      Object.entries(initialShas ?? {})
        .filter(([, sha]) => typeof sha === 'string')
        .map(([type, sha]) => [sha as string, type as PaperType]),
    ),
  );
  const inputRefs = useRef<Partial<Record<PaperType, HTMLInputElement | null>>>({});

  function patchRow(type: PaperType, patch: Partial<RowState>) {
    setRows((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  }

  function authHeaders(json = true): Record<string, string> {
    const headers: Record<string, string> = json ? { 'Content-Type': 'application/json' } : {};
    if (guestToken) headers['X-Guest-Token'] = guestToken;
    return headers;
  }

  async function pollVerification(evidenceId: string): Promise<PaperVerification | 'timeout'> {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      try {
        const res = await fetch(`/api/v1/cases/${caseId}/swarm-events?limit=10`, {
          headers: authHeaders(false),
        });
        if (!res.ok) continue;
        const json = await res.json();
        const events: Array<{ event_type: string; metadata_json?: Record<string, unknown> }> =
          json.events ?? [];
        const match = events.find(
          (event) =>
            event.event_type === 'evidence.verified' && event.metadata_json?.evidence_id === evidenceId,
        );
        if (match) {
          const m = match.metadata_json ?? {};
          const mismatches = Array.isArray(m.mismatches)
            ? (m.mismatches as unknown[]).filter(
                (v): v is VerificationMismatch =>
                  typeof v === 'object' &&
                  v !== null &&
                  typeof (v as Record<string, unknown>).field === 'string',
              )
            : [];
          return {
            confidence: typeof m.confidence === 'number' ? m.confidence : null,
            forgery: Boolean(m.forgery_risk),
            mismatches,
            humanReview: Boolean(m.human_review_required),
            relevant: m.relevant === undefined ? undefined : m.relevant !== false,
            documentKind: typeof m.document_kind === 'string' ? m.document_kind : null,
          };
        }
      } catch {
        // one missed poll isn't fatal — try again next tick
      }
    }
    return 'timeout';
  }

  async function handleUpload(type: PaperType, file: File, isCore: boolean) {
    const fileProblem = validateUploadFile(file);
    if (fileProblem) {
      patchRow(type, { status: 'error', error: fileProblem });
      return;
    }

    // Compute the hash up front so the same file can't be added to two slots.
    let sha256: string;
    try {
      sha256 = await computeSha256HexInBrowser(file);
    } catch {
      patchRow(type, { status: 'error', error: t('fileReadError') });
      return;
    }
    const usedIn = usedShas.current.get(sha256);
    if (usedIn && usedIn !== type) {
      patchRow(type, {
        status: rows[type].status === 'done' ? 'done' : 'error',
        error: t('sameFile', {
          usedLabel: labelFor(usedIn),
          realLabel: labelFor(type).toLowerCase(),
        }),
      });
      return;
    }

    patchRow(type, { status: 'uploading', error: null, pending: false, verification: null });
    try {
      const urlRes = await fetch(`/api/v1/cases/${caseId}/evidence/upload-url`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          evidence_type: type,
          filename: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
        }),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) throw new Error(urlJson.error?.message ?? t('uploadUrlError'));

      const putRes = await fetch(urlJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error(t('storageError'));

      const confirmRes = await fetch(`/api/v1/cases/${caseId}/evidence/${urlJson.evidence_id}/confirm`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ sha256 }),
      });
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) throw new Error(confirmJson.error?.message ?? t('confirmError'));

      // Register the hash against this slot (replace any previous file here).
      for (const [existingSha, slot] of usedShas.current) {
        if (slot === type) usedShas.current.delete(existingSha);
      }
      usedShas.current.set(sha256, type);

      router.refresh();

      if (!isCore) {
        // Extras show a simple "Added" — the seal + background check still run.
        patchRow(type, { status: 'done', pending: true });
        return;
      }

      patchRow(type, { status: 'checking' });
      const verification = await pollVerification(urlJson.evidence_id);
      if (verification === 'timeout') {
        patchRow(type, { status: 'done', pending: true, verification: null });
      } else {
        patchRow(type, { status: 'done', verification, pending: false });
      }

      if (type === 'freeze_sms') {
        // Deliver the "AI explains your notice" promise — advisory, never blocks.
        try {
          await fetch(`/api/v1/cases/${caseId}/notice-analysis`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ input_kind: 'image', evidence_id: urlJson.evidence_id }),
          });
        } catch {
          // best-effort — the papers page still works without the explanation
        }
      }
      router.refresh();
    } catch (error) {
      patchRow(type, {
        status: 'error',
        error: error instanceof Error ? error.message : t('uploadError'),
      });
    }
  }

  const coreDone = coreDocs.filter((d) => rowCounts(rows[d.type])).length;
  const extrasDone = extraDocs.filter((d) => rowCounts(rows[d.type])).length;

  return (
    <div className="flex flex-col gap-3.5" data-testid="papers-checklist">
      {reasonLabel ? (
        <p className="rounded-[var(--radius-md)] border border-[var(--color-sky-deep)]/20 bg-[var(--color-sky-muted)] px-3 py-2 text-[0.8125rem] font-medium text-[var(--color-sky-deep)]">
          {t.rich('reasonBanner', {
            reason: reasonLabel.toLowerCase(),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
      ) : null}
      <p aria-live="polite" className="type-mono-data text-[0.8125rem] text-ink-faint">
        {t('added', { done: coreDone, total: coreCount })}
        {extrasDone ? t('extraSuffix', { extra: extrasDone }) : ''}
      </p>

      <div className="flex flex-col gap-2.5">
        {coreDocs.map((doc) => {
          const row = rows[doc.type];
          const klass = row.status === 'done' && !row.pending ? docClassOf(row.verification) : null;
          const unreadable = klass === 'unreadable';
          const showReplace = row.status === 'done';
          return (
            <div key={doc.type} className="u-card px-4 py-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.90625rem] font-semibold text-[var(--ink)]">{doc.label}</p>
                  <p className="mt-1 text-[0.78125rem] leading-normal text-[var(--ink-muted)]">{doc.why}</p>
                  {officialTerms && doc.term ? (
                    <span className="mt-1.5 inline-block rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-px text-[0.6875rem] text-[var(--ink-muted)]">
                      {t('bankCallsThis', { term: doc.term })}
                    </span>
                  ) : null}
                </div>

                {row.status === 'checking' || row.status === 'uploading' ? (
                  <span className="flex flex-none items-center gap-1.5 rounded-full bg-[var(--color-sky-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--color-sky-deep)]">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    {row.status === 'uploading' ? t('saving') : t('checking')}
                  </span>
                ) : unreadable ? (
                  <button
                    type="button"
                    onClick={() => inputRefs.current[doc.type]?.click()}
                    className="u-btn u-btn-primary min-h-[40px] flex-none px-4 text-[0.8125rem] font-semibold"
                  >
                    {t('replacePhoto')}
                  </button>
                ) : row.status === 'done' ? (
                  <span className="flex-none rounded-full bg-[var(--success-muted)] px-2.5 py-1 text-xs font-semibold text-[var(--success)]">
                    {klass === 'saved' || row.pending ? t('savedChip') : t('checkedChip')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRefs.current[doc.type]?.click()}
                    className="u-btn u-btn-primary min-h-[40px] flex-none px-4 text-[0.8125rem] font-semibold"
                  >
                    {t('addPhoto')}
                  </button>
                )}
                <input
                  ref={(el) => {
                    inputRefs.current[doc.type] = el;
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  aria-label={t('addPhotoAria', { label: doc.label })}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(doc.type, file, true);
                    e.target.value = '';
                  }}
                />
              </div>

              {row.status === 'checking' ? (
                <div className="mt-2.5 border-t border-[var(--surface)] pt-2" aria-live="polite">
                  <p className="text-xs font-semibold text-[var(--color-sky-deep)]">
                    {t('aiChecking')}
                  </p>
                  <p className="mt-1 text-[0.71875rem] text-[var(--ink-faint)]">
                    {t('aiCheckingSub')}
                  </p>
                </div>
              ) : null}

              {row.status === 'done' ? (
                <div className="mt-2.5 border-t border-[var(--surface)] pt-2 text-xs" aria-live="polite">
                  {unreadable && row.verification?.documentKind === 'pdf_no_text' ? (
                    <p className="text-[var(--warn)]">{t('pdfNoText')}</p>
                  ) : unreadable && row.verification?.relevant === false ? (
                    <p className="text-[var(--warn)]">
                      {t('wrongDoc', { article: doc.article, kindLabel: doc.kindLabel })}
                    </p>
                  ) : unreadable ? (
                    <p className="text-[var(--warn)]">{t('unreadable')}</p>
                  ) : klass === 'flagged' ? (
                    <div className="text-[var(--ink-faint)]">
                      <p>{t('flaggedIntro')}</p>
                      {(row.verification?.mismatches ?? []).map((m) => (
                        <p key={m.field} className="mt-1">
                          {t('flaggedMismatch', { field: m.field, found: m.found, expected: m.expected })}
                        </p>
                      ))}
                    </div>
                  ) : klass === 'saved' || row.pending ? (
                    <p className="text-[var(--ink-faint)]">{t('savedHuman')}</p>
                  ) : (
                    <p className="text-[var(--ink-faint)]">
                      {t('noIssues', { pct: Math.round((row.verification?.confidence ?? 0) * 100) })}
                    </p>
                  )}
                  {showReplace && !unreadable ? (
                    <button
                      type="button"
                      onClick={() => inputRefs.current[doc.type]?.click()}
                      className="mt-1.5 cursor-pointer text-[0.71875rem] font-semibold text-[var(--color-sky-deep)] underline underline-offset-2"
                    >
                      {t('replaceDifferent')}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {row.status === 'error' && row.error ? (
                <p role="alert" className="u-alert u-alert-error mt-2.5">
                  {row.error}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      <section className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)]/60 px-4 py-3.5">
        <p className="text-[0.84375rem] font-semibold text-[var(--ink)]">
          {t('extrasTitle')} <span className="font-normal text-[var(--ink-faint)]">{t('optional')}</span>
        </p>
        <div className="mt-2.5 flex flex-col gap-2">
          {extraDocs.map((doc) => {
            const row = rows[doc.type];
            return (
              <div key={doc.type} className="flex items-center gap-2.5">
                <span className="flex-1 text-[0.8125rem] text-[var(--ink-muted)]">{doc.label}</span>
                {row.status === 'done' ? (
                  <span className="flex-none text-xs font-semibold text-[var(--success)]">{t('addedChip')}</span>
                ) : row.status === 'uploading' || row.status === 'checking' ? (
                  <span className="flex flex-none items-center gap-1.5 text-xs font-semibold text-[var(--color-sky-deep)]">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    {t('saving')}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => inputRefs.current[doc.type]?.click()}
                    className="flex min-h-[34px] flex-none cursor-pointer items-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] px-3 text-xs font-semibold text-[var(--color-sky-deep)]"
                  >
                    {t('add')}
                    <span className="sr-only"> — {doc.label}</span>
                  </button>
                )}
                <input
                  ref={(el) => {
                    inputRefs.current[doc.type] = el;
                  }}
                  type="file"
                  accept="image/*,application/pdf"
                  className="sr-only"
                  aria-label={t('addAria', { label: doc.label })}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUpload(doc.type, file, false);
                    e.target.value = '';
                  }}
                />
              </div>
            );
          })}
        </div>
        {extraDocs.some((d) => rows[d.type]?.status === 'error' && rows[d.type]?.error) ? (
          <p role="alert" className="u-alert u-alert-error mt-2.5">
            {extraDocs.map((d) => rows[d.type]?.error).find(Boolean)}
          </p>
        ) : null}
      </section>
    </div>
  );
}
