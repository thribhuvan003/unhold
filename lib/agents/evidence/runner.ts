import 'server-only';

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  EvidenceBundleOutputSchema,
  type EvidenceBundleManifestEntry,
  type EvidenceBundleOutput,
} from '@/lib/agents/schemas';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { prepareForBundle } from '@/lib/evidence/prepare-image';
import { computeSha256Hex } from '@/lib/evidence/sha256';
import { BUNDLE_BUCKET, EVIDENCE_BUCKET } from '@/lib/evidence/storage-path';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Database, Json } from '@/supabase/database.types';
import type { AgentRunResult } from '@/lib/agents/runner';

type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

type EvidenceBundleItem = {
  id: string;
  storage_path: string;
  mime_type: string | null;
  evidence_type: string;
  created_at: string;
  sha256: string;
};

export type EvidenceBundleInput = {
  case_id: string;
  case_public_id: string;
  evidence: EvidenceBundleItem[];
};

export type EvidenceBundleResult = {
  output: EvidenceBundleOutput;
  pdfBytes: Uint8Array | null;
};

function emptyBundleOutput(): EvidenceBundleOutput {
  return EvidenceBundleOutputSchema.parse({
    manifest: [],
    manifest_sha256: null,
    sealed_content_path: null,
    evidence_count: 0,
    human_review_required: true,
  });
}

export async function loadEvidenceBundleInput(caseId: string): Promise<EvidenceBundleInput> {
  const supabase = createAdminClient();

  const { data: caseRow, error: caseError } = await supabase
    .from('cases')
    .select('id, public_id')
    .eq('id', caseId)
    .maybeSingle();

  if (caseError || !caseRow) {
    throw new Error(`case_not_found: ${caseId}`);
  }

  const { data: evidenceRows, error: evidenceError } = await supabase
    .from('evidence')
    .select('id, storage_path, mime_type, evidence_type, created_at, sha256')
    .eq('case_id', caseId)
    .not('sha256_verified_at', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (evidenceError) {
    throw new Error(`evidence_bundle_load_failed: ${evidenceError.message}`);
  }

  return {
    case_id: caseRow.id,
    case_public_id: caseRow.public_id,
    evidence: evidenceRows ?? [],
  };
}

async function drawCoverPage(doc: PDFDocument, input: EvidenceBundleInput): Promise<void> {
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([612, 792]);
  let y = 792 - 72;

  const drawLine = (text: string, size = 11) => {
    page.drawText(text, { x: 56, y, size, font, color: rgb(0, 0, 0) });
    y -= size + 8;
  };

  drawLine('Unhold — Evidence Bundle', 16);
  drawLine(`Case: ${input.case_public_id}`);
  drawLine(`Generated: ${new Date().toISOString()}`);
  drawLine(`Evidence files: ${input.evidence.length}`);
  y -= 8;
  for (const item of input.evidence) {
    drawLine(`- ${item.evidence_type}: ${item.storage_path} (sha256 ${item.sha256.slice(0, 12)}…)`, 9);
  }
}

/**
 * Builds the sealed PDF in memory and computes its manifest — no DB/storage writes.
 * Source files: only image/jpeg, image/png, application/pdf can reach storage
 * (assertEvidenceUploadConstraints), so those are the only 3 branches handled.
 */
export async function runEvidenceBundle(input: EvidenceBundleInput): Promise<EvidenceBundleResult> {
  if (input.evidence.length === 0) {
    return { output: emptyBundleOutput(), pdfBytes: null };
  }

  const supabase = createAdminClient();
  const bundleDoc = await PDFDocument.create();
  await drawCoverPage(bundleDoc, input);

  const manifest: EvidenceBundleManifestEntry[] = [];

  for (const item of input.evidence) {
    if (
      item.mime_type !== 'application/pdf' &&
      item.mime_type !== 'image/jpeg' &&
      item.mime_type !== 'image/png'
    ) {
      throw new Error(`evidence_bundle_unsupported_mime: ${item.mime_type ?? 'unknown'}`);
    }

    const { data: fileData, error } = await supabase.storage
      .from(EVIDENCE_BUCKET)
      .download(item.storage_path);

    if (error || !fileData) {
      throw new Error(`evidence_bundle_download_failed: ${item.id}`);
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());

    if (item.mime_type === 'application/pdf') {
      const srcDoc = await PDFDocument.load(bytes);
      const copiedPages = await bundleDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => bundleDoc.addPage(page));
    } else {
      // Presentation copy only — the manifest keeps the ORIGINAL file's sha256.
      const prepared = await prepareForBundle(Buffer.from(bytes), item.mime_type);
      const image =
        prepared.mime === 'image/png'
          ? await bundleDoc.embedPng(prepared.buffer)
          : await bundleDoc.embedJpg(prepared.buffer);
      // A4 portrait with a 24pt margin; fit without enlarging, centered.
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 24;
      const scale = Math.min(
        (pageWidth - margin * 2) / image.width,
        (pageHeight - margin * 2) / image.height,
        1,
      );
      const drawWidth = image.width * scale;
      const drawHeight = image.height * scale;
      const page = bundleDoc.addPage([pageWidth, pageHeight]);
      page.drawImage(image, {
        x: (pageWidth - drawWidth) / 2,
        y: (pageHeight - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      });
    }

    manifest.push({
      path: item.storage_path,
      sha256: item.sha256,
      evidence_type: item.evidence_type,
      uploaded_at: item.created_at,
    });
  }

  const manifestSha256 = computeSha256Hex(Buffer.from(JSON.stringify(manifest)));
  const sealedContentPath = `${input.case_id}/${manifestSha256}.pdf`;
  const pdfBytes = await bundleDoc.save();

  return {
    output: EvidenceBundleOutputSchema.parse({
      manifest,
      manifest_sha256: manifestSha256,
      sealed_content_path: sealedContentPath,
      evidence_count: manifest.length,
      human_review_required: false,
    }),
    pdfBytes,
  };
}

export async function applyEvidenceBundleSideEffects(
  input: EvidenceBundleInput,
  result: EvidenceBundleResult,
  jobId?: string | null,
): Promise<{ audit_seal_id: string | null; sealed_content_path: string | null }> {
  if (!result.pdfBytes || !result.output.manifest_sha256 || !result.output.sealed_content_path) {
    await appendSwarmEvent({
      case_id: input.case_id,
      agent_role: 'EVIDENCE',
      event_type: 'evidence.bundle_skipped',
      severity: 'human_required',
      message: 'No verified evidence available to bundle',
      job_id: jobId ?? null,
      metadata: { evidence_count: 0 },
    });
    return { audit_seal_id: null, sealed_content_path: null };
  }

  const supabase = createAdminClient();
  const sealedContentPath = result.output.sealed_content_path;
  const manifestSha256 = result.output.manifest_sha256;

  const { error: uploadError } = await supabase.storage
    .from(BUNDLE_BUCKET)
    .upload(sealedContentPath, result.pdfBytes, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`evidence_bundle_upload_failed: ${uploadError.message}`);
  }

  const { data: seal, error: sealError } = await supabase
    .from('audit_seals')
    .insert({
      case_id: input.case_id,
      seal_type: 'evidence_bundle',
      manifest_sha256: manifestSha256,
      manifest_json: result.output.manifest as unknown as Json,
      sealed_content_path: sealedContentPath,
      sealed_content_bucket: BUNDLE_BUCKET,
      sealed_by_type: 'system',
    })
    .select('id')
    .single();

  if (sealError || !seal) {
    throw new Error(`evidence_bundle_seal_failed: ${sealError?.message ?? 'unknown'}`);
  }

  const evidenceIds = input.evidence.map((item) => item.id);
  await supabase
    .from('evidence')
    .update({ bundle_id: seal.id } as unknown as Database['public']['Tables']['evidence']['Update'])
    .in('id', evidenceIds);

  const { data: caseRow } = await supabase
    .from('cases')
    .select('metadata_json')
    .eq('id', input.case_id)
    .maybeSingle();

  const mergedMetadata = {
    ...((caseRow?.metadata_json as Record<string, unknown>) ?? {}),
    bundle_sha256: manifestSha256,
    bundle_id: seal.id,
  };

  await supabase
    .from('cases')
    .update({
      metadata_json: mergedMetadata as Json,
    } as unknown as Database['public']['Tables']['cases']['Update'])
    .eq('id', input.case_id);

  await appendSwarmEvent({
    case_id: input.case_id,
    agent_role: 'EVIDENCE',
    event_type: 'evidence.bundled',
    severity: 'info',
    message: `Evidence bundle sealed (${result.output.evidence_count} files, manifest ${manifestSha256.slice(0, 12)}…)`,
    job_id: jobId ?? null,
    metadata: { audit_seal_id: seal.id, evidence_count: result.output.evidence_count },
  });

  return { audit_seal_id: seal.id, sealed_content_path: sealedContentPath };
}

export async function runEvidenceBundleJob(job: AgentJobRow): Promise<AgentRunResult> {
  const payload = (job.payload_json ?? {}) as Record<string, unknown>;
  const caseId = String(payload.case_id ?? '');

  const input = await loadEvidenceBundleInput(caseId);
  const result = await runEvidenceBundle(input);
  await applyEvidenceBundleSideEffects(input, result, job.id);

  return {
    output: result.output as unknown as Record<string, unknown>,
    cost_usd: 0,
  };
}
