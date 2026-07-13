import 'server-only';

import JSZip from 'jszip';
import { createAdminClient } from '@/lib/supabase/admin';
import { EVIDENCE_BUCKET, sanitizeFilename } from '@/lib/evidence/storage-path';

/**
 * A direct-response ZIP deliberately stays small enough for the public-beta
 * serverless function. Larger exports need an asynchronous, separately stored
 * workflow, which this privacy-critical first slice intentionally avoids.
 */
export const MAX_EXPORT_SOURCE_BYTES = 100 * 1024 * 1024;

export class CaseDataExportError extends Error {
  constructor(
    readonly code: 'case_not_found' | 'export_too_large' | 'unsupported_storage' | 'file_missing',
    message: string,
  ) {
    super(message);
    this.name = 'CaseDataExportError';
  }
}

type ExportEvidence = {
  evidence_type: string;
  original_filename: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  sha256: string;
  sha256_verified_at: string | null;
  vision_confidence: number | null;
  human_verified: boolean;
  human_verified_at: string | null;
  forgery_flag: boolean;
  forgery_notes: string | null;
  redaction_applied: boolean;
  created_at: string;
  storage_bucket: string;
  storage_path: string;
};

export function assertWithinExportLimit(totalBytes: number): void {
  if (totalBytes > MAX_EXPORT_SOURCE_BYTES) {
    throw new CaseDataExportError(
      'export_too_large',
      'This case has more than 100 MB of files. Download the evidence bundle separately for now.',
    );
  }
}

export function evidenceExportPath(index: number, originalFilename: string | null): string {
  const safeName = sanitizeFilename(originalFilename || 'document') || 'document';
  return `evidence/${String(index + 1).padStart(3, '0')}-${safeName}`;
}

export function buildCaseExportFilename(publicId: string): string {
  return `unhold-${publicId}-data.zip`;
}

export type CaseDataExport = {
  bytes: Uint8Array;
  filename: string;
};

/**
 * Builds an owner-downloadable, in-memory ZIP. The JSON intentionally uses
 * allowlists: it must never contain recovery hashes, internal storage paths,
 * signed URLs, worker metadata, raw agent outputs, or identifiers for other
 * people.
 */
export async function buildCaseDataExport(caseId: string): Promise<CaseDataExport> {
  const admin = createAdminClient();
  const [caseResult, evidenceResult, escalationResult, actionResult, noticeResult, consentResult] =
    await Promise.all([
      admin
        .from('cases')
        .select(
          'public_id, status, bank_id, playbook_id, freeze_reason, freeze_type, victim_role, resolution_type, frozen_amount_paise, released_amount_paise, account_last4, pan_masked, ncrp_id, external_report_url, state_code, district, narration_codes, intake_json, classification_confidence, escalation_level, user_action_required, next_user_action_type, next_user_action_due_at, public_stats_opt_in, satisfaction_score, resolution_confirmed_by, resolution_notes, frozen_since, resolved_at, closed_at, stalled_at, created_at, updated_at',
        )
        .eq('id', caseId)
        .maybeSingle(),
      admin
        .from('evidence')
        .select(
          'evidence_type, original_filename, mime_type, file_size_bytes, sha256, sha256_verified_at, vision_confidence, human_verified, human_verified_at, forgery_flag, forgery_notes, redaction_applied, created_at, storage_bucket, storage_path',
        )
        .eq('case_id', caseId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      admin
        .from('escalations')
        .select(
          'level, channel, status, letter_template_id, letter_subject, letter_body, letter_body_html, user_consent_at, approved_at, sent_at, response_due_at, response_received_at, wait_days, created_at, updated_at',
        )
        .eq('case_id', caseId)
        .order('level', { ascending: true }),
      admin
        .from('user_actions')
        .select('action_type, title, description, title_hi, priority, due_at, completed_at, dismissed_at, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      admin
        .from('notice_analysis')
        .select(
          'input_kind, freeze_reason, severity, confidence, plain_english, what_this_means, suggested_next, extracted_amount_paise, extracted_date, extracted_reference, human_review_required, created_at',
        )
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
      admin
        .from('consent_records')
        .select('consent_type, granted, consent_text_version, consent_text_hash, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true }),
    ]);

  if (caseResult.error) throw caseResult.error;
  if (!caseResult.data) {
    throw new CaseDataExportError('case_not_found', 'Case not found');
  }
  if (evidenceResult.error) throw evidenceResult.error;
  if (escalationResult.error) throw escalationResult.error;
  if (actionResult.error) throw actionResult.error;
  if (noticeResult.error) throw noticeResult.error;
  if (consentResult.error) throw consentResult.error;

  const evidence = (evidenceResult.data ?? []) as ExportEvidence[];
  const declaredBytes = evidence.reduce((sum, item) => sum + Math.max(0, item.file_size_bytes ?? 0), 0);
  assertWithinExportLimit(declaredBytes);

  const zip = new JSZip();
  zip.file(
    'case.json',
    JSON.stringify(
      {
        format_version: 'unhold-case-export-v1',
        exported_at: new Date().toISOString(),
        case: caseResult.data,
        evidence: evidence.map(({ storage_bucket, storage_path, ...item }) => {
          void storage_bucket;
          void storage_path;
          return item;
        }),
        letters: escalationResult.data ?? [],
        user_actions: actionResult.data ?? [],
        notice_analysis: noticeResult.data ?? [],
        consent_history: consentResult.data ?? [],
      },
      null,
      2,
    ),
  );

  let actualBytes = 0;
  for (const [index, item] of evidence.entries()) {
    // Evidence uploads are written only to this bucket. Refuse a malformed row
    // rather than turning a data export into a generic storage-file reader.
    if (item.storage_bucket !== EVIDENCE_BUCKET) {
      throw new CaseDataExportError('unsupported_storage', 'Could not prepare one of your evidence files.');
    }

    const { data: file, error } = await admin.storage.from(EVIDENCE_BUCKET).download(item.storage_path);
    if (error || !file) {
      throw new CaseDataExportError('file_missing', 'Could not retrieve one of your evidence files.');
    }

    actualBytes += file.size;
    assertWithinExportLimit(actualBytes);
    zip.file(evidenceExportPath(index, item.original_filename), new Uint8Array(await file.arrayBuffer()));
  }

  const bytes = await zip.generateAsync({
    type: 'uint8array',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
    streamFiles: true,
  });

  return {
    bytes,
    filename: buildCaseExportFilename(caseResult.data.public_id),
  };
}
