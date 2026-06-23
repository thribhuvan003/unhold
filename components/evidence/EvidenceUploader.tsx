'use client';

import { useEffect, useRef, useState } from 'react';
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

type VerificationFeedback = {
  confidence: number;
  forgery_risk: boolean;
  forgery_flags: string[];
  mismatches: string[];
  human_review_required: boolean;
};

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // ~60s, then we stop and let the case detail page catch up later

export function EvidenceUploader({
  caseId,
  guestToken,
  defaultEvidenceType = 'freeze_sms',
}: EvidenceUploaderProps) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(defaultEvidenceType);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingEvidenceId, setPendingEvidenceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<VerificationFeedback | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const pollAttemptsRef = useRef(0);

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
            mismatches: Array.isArray(metadata.mismatches) ? (metadata.mismatches as string[]) : [],
            human_review_required: Boolean(metadata.human_review_required),
          });
          setPendingEvidenceId(null);
        } else if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
          setPendingEvidenceId(null);
          setPollTimedOut(true);
        }
      } catch {
        // ponytail: one missed poll isn't fatal — the interval just tries again next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pendingEvidenceId, caseId, guestToken]);

  async function handleUpload(file: File) {
    setUploading(true);
    setStatus(null);
    setFeedback(null);
    setPendingEvidenceId(null);
    setPollTimedOut(false);
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

      setStatus('Evidence uploaded — SHA-256 verified.');
      setPendingEvidenceId(urlJson.evidence_id);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-[#1F6B8A]/30 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-semibold text-[#0B1F33]">Upload evidence</h3>
      <p className="mt-1 text-sm text-slate-600">JPEG, PNG, or PDF up to 25MB. SHA-256 verified on confirm.</p>

      <label className="mt-4 block text-sm font-medium text-[#0B1F33]">
        Evidence type
        <select
          className="mt-1 w-full min-h-[44px] rounded border border-slate-300 px-3"
          value={evidenceType}
          onChange={(e) => setEvidenceType(e.target.value as EvidenceType)}
        >
          <option value="freeze_sms">Freeze SMS</option>
          <option value="bank_statement">Bank statement</option>
          <option value="passbook_screenshot">Passbook screenshot</option>
          <option value="other">Other</option>
        </select>
      </label>

      <label className="mt-4 block">
        <span className="sr-only">Choose file</span>
        <input
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          className="mt-2 w-full min-h-[44px] text-sm"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleUpload(file);
          }}
        />
      </label>

      {status ? <p className="mt-3 text-sm text-slate-700">{status}</p> : null}

      {pendingEvidenceId ? (
        <p className="mt-2 text-sm text-[#1F6B8A]" aria-live="polite">
          AI is checking this document for you&hellip;
        </p>
      ) : null}

      {feedback ? <VerificationFeedbackPanel feedback={feedback} /> : null}

      {pollTimedOut ? (
        <p className="mt-2 text-sm text-slate-600" aria-live="polite">
          Still checking this document in the background — refresh this case&apos;s activity log in a moment to see
          the result. Your upload was saved either way.
        </p>
      ) : null}
    </div>
  );
}

function VerificationFeedbackPanel({ feedback }: { feedback: VerificationFeedback }) {
  const flags: string[] = [];
  if (feedback.forgery_risk) {
    flags.push(
      feedback.forgery_flags.length > 0
        ? `Possible authenticity issue: ${feedback.forgery_flags.join(', ')}`
        : 'Possible authenticity issue detected.',
    );
  }
  for (const mismatch of feedback.mismatches) {
    flags.push(`Mismatch: ${mismatch}`);
  }

  const hasAutomatedReadOut = feedback.confidence > 0;

  return (
    <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-sm" aria-live="polite">
      {flags.length > 0 ? (
        <ul className="space-y-1 text-amber-800">
          {flags.map((flag) => (
            <li key={flag}>⚠ {flag}</li>
          ))}
        </ul>
      ) : hasAutomatedReadOut ? (
        <p className="text-emerald-700">✓ No issues detected automatically.</p>
      ) : null}

      {feedback.human_review_required ? (
        <p className="mt-1 text-slate-600">
          A human reviewer will double-check this before it&apos;s used in any letter — nothing is sent automatically.
        </p>
      ) : null}
    </div>
  );
}