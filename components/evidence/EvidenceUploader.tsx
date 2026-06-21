'use client';

import { useState } from 'react';
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

export function EvidenceUploader({
  caseId,
  guestToken,
  defaultEvidenceType = 'freeze_sms',
}: EvidenceUploaderProps) {
  const [evidenceType, setEvidenceType] = useState<EvidenceType>(defaultEvidenceType);
  const [status, setStatus] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    setStatus(null);
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

      setStatus('Evidence uploaded and verified.');
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
    </div>
  );
}