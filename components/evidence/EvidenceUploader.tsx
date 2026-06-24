'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/ui/cn';
import { computeSha256HexInBrowser } from '@/lib/evidence/sha256';

type EvidenceType =
  | 'freeze_sms'
  | 'bank_statement'
  | 'passbook_screenshot'
  | 'ncrp_acknowledgement'
  | 'police_fir'
  | 'pan_card'
  | 'aadhaar_masked'
  | 'chat_screenshot'
  | 'letter_sent_proof'
  | 'bank_release_letter'
  | 'court_order'
  | 'other';

interface EvidenceUploaderProps {
  caseId: string;
  guestToken?: string;
  defaultEvidenceType?: EvidenceType;
}

type VerificationMismatch = { field: string; expected: string; found: string };

type VerificationFeedback = {
  confidence: number;
  forgery_risk: boolean;
  forgery_flags: string[];
  mismatches: VerificationMismatch[];
  human_review_required: boolean;
};

function isVerificationMismatch(value: unknown): value is VerificationMismatch {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).field === 'string' &&
    typeof (value as Record<string, unknown>).expected === 'string' &&
    typeof (value as Record<string, unknown>).found === 'string'
  );
}

type UploadPhase = 'idle' | 'uploading' | 'verifying' | 'complete' | 'error';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  freeze_sms: 'Freeze SMS',
  bank_statement: 'Bank statement',
  passbook_screenshot: 'Passbook screenshot',
  ncrp_acknowledgement: 'NCRP acknowledgement',
  police_fir: 'Police FIR',
  pan_card: 'PAN card (masked)',
  aadhaar_masked: 'Aadhaar (masked)',
  chat_screenshot: 'Chat screenshot',
  letter_sent_proof: 'Letter sent proof',
  bank_release_letter: 'Bank release letter',
  court_order: 'Court order',
  other: 'Other document',
};

export function EvidenceUploader({
  caseId,
  guestToken,
  defaultEvidenceType = 'freeze_sms',
}: EvidenceUploaderProps) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(defaultEvidenceType);
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [pendingEvidenceId, setPendingEvidenceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<VerificationFeedback | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);
  const panelId = useId();

  const uploading = phase === 'uploading';

  useEffect(() => {
    if (!pendingEvidenceId) return;
    pollAttemptsRef.current = 0;

    const headers: Record<string, string> = {};
    if (guestToken) headers['X-Guest-Token'] = guestToken;

    const interval = setInterval(async () => {
      pollAttemptsRef.current += 1;
      try {
        const res = await fetch(`/api/v1/cases/${caseId}/swarm-events?limit=10`, { headers });
        if (!res.ok) return;
        const json = await res.json();
        const events: Array<{ event_type: string; metadata_json?: Record<string, unknown> }> =
          json.events ?? [];
        const match = events.find(
          (event) =>
            event.event_type === 'evidence.verified' &&
            event.metadata_json?.evidence_id === pendingEvidenceId,
        );

        if (match) {
          const metadata = match.metadata_json ?? {};
          setFeedback({
            confidence: typeof metadata.confidence === 'number' ? metadata.confidence : 0,
            forgery_risk: Boolean(metadata.forgery_risk),
            forgery_flags: Array.isArray(metadata.forgery_flags) ? (metadata.forgery_flags as string[]) : [],
            mismatches: Array.isArray(metadata.mismatches)
              ? metadata.mismatches.filter(isVerificationMismatch)
              : [],
            human_review_required: Boolean(metadata.human_review_required),
          });
          setPendingEvidenceId(null);
          setPhase('complete');
        } else if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
          setPendingEvidenceId(null);
          setPollTimedOut(true);
          setPhase('complete');
        }
      } catch {
        // ponytail: one missed poll isn't fatal — the interval just tries again next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pendingEvidenceId, caseId, guestToken]);

  async function handleUpload(file: File) {
    setPhase('uploading');
    setStatusMessage(null);
    setFeedback(null);
    setPendingEvidenceId(null);
    setPollTimedOut(false);
    setSelectedFileName(file.name);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (guestToken) headers['X-Guest-Token'] = guestToken;

      const urlRes = await fetch(`/api/v1/cases/${caseId}/evidence/upload-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          evidence_type: evidenceType,
          filename: file.name,
          mime_type: file.type,
          file_size_bytes: file.size,
        }),
      });

      const urlJson = await urlRes.json();
      if (!urlRes.ok) {
        throw new Error(urlJson.error?.message ?? 'Failed to get upload URL');
      }

      const uploadRes = await fetch(urlJson.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) {
        throw new Error('Storage upload failed');
      }

      const sha256 = await computeSha256HexInBrowser(file);
      const confirmRes = await fetch(
        `/api/v1/cases/${caseId}/evidence/${urlJson.evidence_id}/confirm`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ sha256 }),
        },
      );
      const confirmJson = await confirmRes.json();
      if (!confirmRes.ok) {
        throw new Error(confirmJson.error?.message ?? 'Confirm failed');
      }

      setStatusMessage('Evidence uploaded — SHA-256 verified.');
      setPendingEvidenceId(urlJson.evidence_id);
      setPhase('verifying');
    } catch (error) {
      setPhase('error');
      setStatusMessage(error instanceof Error ? error.message : 'Upload failed');
      setSelectedFileName(null);
    }
  }

  return (
    <div className="u-card p-5 sm:p-6" aria-labelledby={`${panelId}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 id={`${panelId}-title`} className="type-display text-xl">
            Upload evidence
          </h3>
          <p className="type-caption mt-1">
            JPEG, PNG, or PDF up to 25MB. SHA-256 verified on confirm.
          </p>
        </div>
        {phase !== 'idle' ? <UploadPhaseBadge phase={phase} pollTimedOut={pollTimedOut} /> : null}
      </div>

      <label className="mt-5 block text-sm font-medium text-[var(--ink)]">
        Evidence type
        <select
          className="u-input mt-1.5"
          value={evidenceType}
          disabled={uploading}
          onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
        >
          {Object.entries(EVIDENCE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4">
        <label
          className={cn('u-dropzone group', uploading && 'u-dropzone-disabled')}
        >
          <FileUp
            className={cn(
              'mb-2 h-6 w-6 text-[var(--ink-faint)] transition-all duration-300',
              !uploading && 'group-hover:scale-110 group-hover:text-[var(--forest)]',
            )}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-[var(--ink)]">
            {selectedFileName && phase !== 'idle' ? selectedFileName : 'Choose a file'}
          </span>
          <span className="mt-1 text-xs text-[var(--ink-faint)]">Tap to browse — one file at a time</span>
          <input
            type="file"
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleUpload(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {phase === 'uploading' ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-[var(--forest)]" aria-live="polite">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Uploading and computing SHA-256&hellip;
        </div>
      ) : null}

      {statusMessage ? (
        <p
          role={phase === 'error' ? 'alert' : 'status'}
          className={cn(
            'mt-3 text-sm',
            phase === 'error' ? 'text-[var(--error)]' : 'text-[var(--ink-muted)]',
          )}
        >
          {statusMessage}
        </p>
      ) : null}

      {phase === 'verifying' && pendingEvidenceId ? (
        <VerificationProgress />
      ) : null}

      {feedback ? <VerificationFeedbackPanel feedback={feedback} /> : null}

      {pollTimedOut ? (
        <div
          className="mt-4 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--paper)] p-4 text-sm text-[var(--ink-muted)]"
          aria-live="polite"
        >
          <p>
            Still checking this document in the background — refresh this case&apos;s activity log in a moment to see
            the result. Your upload was saved either way.
          </p>
          <p className="mt-1 text-xs text-[var(--ink-faint)]">
            Check the <strong className="text-[var(--ink)]">AI Activity</strong> tab below for the full timeline.
          </p>
        </div>
      ) : null}

      {phase === 'complete' && feedback && !feedback.forgery_risk && feedback.mismatches.length === 0 ? (
        <p className="mt-3 text-xs text-[var(--ink-faint)]">
          This result will also appear in your case&apos;s AI Activity timeline.
        </p>
      ) : null}
    </div>
  );
}

function UploadPhaseBadge({ phase, pollTimedOut }: { phase: UploadPhase; pollTimedOut: boolean }) {
  const toneMap: Record<UploadPhase, 'forest' | 'success' | 'neutral' | 'error' | null> = {
    idle: null,
    uploading: 'forest',
    verifying: 'forest',
    complete: pollTimedOut ? 'neutral' : 'success',
    error: 'error',
  };
  const labelMap: Record<UploadPhase, string> = {
    idle: '',
    uploading: 'Uploading',
    verifying: 'Checking',
    complete: pollTimedOut ? 'Saved' : 'Checked',
    error: 'Failed',
  };

  const tone = toneMap[phase];
  const label = labelMap[phase];
  if (!tone || !label) return null;

  return (
    <Badge tone={tone} aria-live="polite">
      {label}
    </Badge>
  );
}

function VerificationProgress() {
  return (
    <div
      className="mt-4 animate-scale-in rounded-[var(--radius-md)] border border-[var(--forest)]/20 bg-[var(--forest-muted)] p-4"
      aria-live="polite"
      role="status"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-[var(--forest)]">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        AI is checking this document for you&hellip;
      </div>
      <ul className="mt-3 space-y-2 text-xs text-[var(--ink-muted)]">
        <li className="flex items-center gap-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden="true" />
          File saved and SHA-256 recorded
        </li>
        <li className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-[var(--forest)]" aria-hidden="true" />
          Running automated document check
        </li>
      </ul>
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full w-1/3 animate-[progress-indeterminate_1.5s_ease-in-out_infinite] rounded-full bg-[var(--forest)]" />
      </div>
      <p className="mt-2 text-xs text-[var(--ink-faint)]">Usually takes under a minute. You can stay on this page.</p>
    </div>
  );
}

function VerificationFeedbackPanel({ feedback }: { feedback: VerificationFeedback }) {
  const flags: Array<{ type: 'warning' | 'info'; text: string }> = [];

  if (feedback.forgery_risk) {
    flags.push({
      type: 'warning',
      text:
        feedback.forgery_flags.length > 0
          ? `Possible authenticity issue: ${feedback.forgery_flags.join(', ')}`
          : 'Possible authenticity issue detected.',
    });
  }
  for (const mismatch of feedback.mismatches) {
    flags.push({
      type: 'warning',
      text: `Worth a quick check — the ${mismatch.field} here (${mismatch.found}) looks different from your notice (${mismatch.expected}). It may be fine; just make sure you uploaded the right document.`,
    });
  }

  const hasAutomatedReadOut = feedback.confidence > 0;
  const isClean = flags.length === 0 && hasAutomatedReadOut;

  return (
    <div
      className={cn(
        'mt-4 animate-scale-in rounded-[var(--radius-md)] border p-4 text-sm',
        isClean
          ? 'border-[var(--success)]/25 bg-[var(--success-muted)]'
          : flags.length > 0
            ? 'border-[var(--warn)]/25 bg-[var(--warn-muted)]'
            : 'border-[var(--border)] bg-[var(--paper)]',
      )}
      aria-live="polite"
      role="status"
    >
      {isClean ? (
        <div className="flex items-start gap-3 text-[var(--success)]">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-medium text-[var(--ink)]">No issues detected automatically</p>
            <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
              Confidence: {Math.round(feedback.confidence * 100)}% — preliminary check, not a guarantee.
            </p>
          </div>
        </div>
      ) : null}

      {flags.length > 0 ? (
        <ul className="space-y-2.5">
          {flags.map((flag) => (
            <li key={flag.text} className="flex items-start gap-2.5 text-[var(--ink)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn)]" aria-hidden="true" />
              <span>{flag.text}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {feedback.human_review_required ? (
        <p
          className={cn(
            'text-[var(--ink-muted)]',
            (flags.length > 0 || isClean) && 'mt-3 border-t border-[var(--border)] pt-3',
          )}
        >
          A human reviewer will double-check this before it&apos;s used in any letter — nothing is sent
          automatically.
        </p>
      ) : null}
    </div>
  );
}