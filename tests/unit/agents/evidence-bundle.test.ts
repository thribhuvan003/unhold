import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import sharp from 'sharp';
import { PDFDocument } from 'pdf-lib';

const storageDownloadMock = vi.fn();
const storageUploadMock = vi.fn();
const fromMock = vi.fn();
const swarmEventMock = vi.fn();

vi.mock('@/lib/swarm/append-event', () => ({
  appendSwarmEvent: (...args: unknown[]) => swarmEventMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (...args: unknown[]) => fromMock(...args),
    storage: {
      from: () => ({
        download: () => storageDownloadMock(),
        upload: (...args: unknown[]) => storageUploadMock(...args),
      }),
    },
  }),
}));

function toArrayBuffer(buf: Buffer | Uint8Array): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function downloadResult(bytes: Buffer | Uint8Array) {
  return { data: { arrayBuffer: async () => toArrayBuffer(bytes) }, error: null };
}

let tinyPng: Buffer;
let tinyJpeg: Buffer;
let tinyPdf: Uint8Array;

beforeAll(async () => {
  tinyPng = await sharp({
    create: { width: 1, height: 1, channels: 3, background: { r: 10, g: 20, b: 30 } },
  })
    .png()
    .toBuffer();
  tinyJpeg = await sharp({
    create: { width: 2, height: 2, channels: 3, background: { r: 200, g: 50, b: 50 } },
  })
    .jpeg()
    .toBuffer();
  const doc = await PDFDocument.create();
  doc.addPage([50, 50]);
  tinyPdf = await doc.save();
});

async function importRunner() {
  return import('@/lib/agents/evidence/runner');
}

describe('runEvidenceBundle', () => {
  beforeEach(() => {
    storageDownloadMock.mockReset();
  });

  it('returns an empty, human-review-required result with zero storage calls when there is no eligible evidence', async () => {
    const { runEvidenceBundle } = await importRunner();
    const result = await runEvidenceBundle({ case_id: 'case-1', case_public_id: 'LL-1', evidence: [] });

    expect(result.output.evidence_count).toBe(0);
    expect(result.output.manifest).toEqual([]);
    expect(result.output.manifest_sha256).toBeNull();
    expect(result.output.sealed_content_path).toBeNull();
    expect(result.output.human_review_required).toBe(true);
    expect(result.pdfBytes).toBeNull();
    expect(storageDownloadMock).not.toHaveBeenCalled();
  });

  it('merges a single real PDF evidence item via copyPages', async () => {
    storageDownloadMock.mockResolvedValue(downloadResult(tinyPdf));
    const { runEvidenceBundle } = await importRunner();

    const result = await runEvidenceBundle({
      case_id: 'case-1',
      case_public_id: 'LL-1',
      evidence: [
        {
          id: 'ev-1',
          storage_path: 'case-1/ev-1/statement.pdf',
          mime_type: 'application/pdf',
          evidence_type: 'bank_statement',
          created_at: '2026-01-01T00:00:00.000Z',
          sha256: 'a'.repeat(64),
        },
      ],
    });

    expect(result.output.evidence_count).toBe(1);
    expect(result.output.manifest).toEqual([
      {
        path: 'case-1/ev-1/statement.pdf',
        sha256: 'a'.repeat(64),
        evidence_type: 'bank_statement',
        uploaded_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(result.output.manifest_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.output.sealed_content_path).toBe(`case-1/${result.output.manifest_sha256}.pdf`);
    expect(result.pdfBytes).not.toBeNull();

    const merged = await PDFDocument.load(result.pdfBytes!);
    // cover page + the 1 page copied from the source PDF
    expect(merged.getPageCount()).toBe(2);
  });

  it('merges a real PNG image evidence item as a full-bleed page', async () => {
    storageDownloadMock.mockResolvedValue(downloadResult(tinyPng));
    const { runEvidenceBundle } = await importRunner();

    const result = await runEvidenceBundle({
      case_id: 'case-2',
      case_public_id: 'LL-2',
      evidence: [
        {
          id: 'ev-2',
          storage_path: 'case-2/ev-2/sms.png',
          mime_type: 'image/png',
          evidence_type: 'freeze_sms',
          created_at: '2026-01-02T00:00:00.000Z',
          sha256: 'b'.repeat(64),
        },
      ],
    });

    expect(result.output.evidence_count).toBe(1);
    const merged = await PDFDocument.load(result.pdfBytes!);
    expect(merged.getPageCount()).toBe(2);
  });

  it('merges a real JPEG image evidence item', async () => {
    storageDownloadMock.mockResolvedValue(downloadResult(tinyJpeg));
    const { runEvidenceBundle } = await importRunner();

    const result = await runEvidenceBundle({
      case_id: 'case-3',
      case_public_id: 'LL-3',
      evidence: [
        {
          id: 'ev-3',
          storage_path: 'case-3/ev-3/id.jpg',
          mime_type: 'image/jpeg',
          evidence_type: 'pan_card',
          created_at: '2026-01-03T00:00:00.000Z',
          sha256: 'c'.repeat(64),
        },
      ],
    });

    expect(result.output.evidence_count).toBe(1);
    const merged = await PDFDocument.load(result.pdfBytes!);
    expect(merged.getPageCount()).toBe(2);
  });

  it('merges mixed PDF + image evidence, preserving caller order in the manifest', async () => {
    storageDownloadMock
      .mockResolvedValueOnce(downloadResult(tinyPdf))
      .mockResolvedValueOnce(downloadResult(tinyPng));
    const { runEvidenceBundle } = await importRunner();

    const result = await runEvidenceBundle({
      case_id: 'case-4',
      case_public_id: 'LL-4',
      evidence: [
        {
          id: 'ev-a',
          storage_path: 'case-4/ev-a/statement.pdf',
          mime_type: 'application/pdf',
          evidence_type: 'bank_statement',
          created_at: '2026-01-01T00:00:00.000Z',
          sha256: 'd'.repeat(64),
        },
        {
          id: 'ev-b',
          storage_path: 'case-4/ev-b/sms.png',
          mime_type: 'image/png',
          evidence_type: 'freeze_sms',
          created_at: '2026-01-02T00:00:00.000Z',
          sha256: 'e'.repeat(64),
        },
      ],
    });

    expect(result.output.manifest.map((m) => m.path)).toEqual([
      'case-4/ev-a/statement.pdf',
      'case-4/ev-b/sms.png',
    ]);
    const merged = await PDFDocument.load(result.pdfBytes!);
    // cover + 1 copied PDF page + 1 image page
    expect(merged.getPageCount()).toBe(3);
  });

  it('produces a deterministic manifest_sha256 for the same evidence set across two runs', async () => {
    storageDownloadMock.mockResolvedValue(downloadResult(tinyPdf));
    const { runEvidenceBundle } = await importRunner();
    const evidence = [
      {
        id: 'ev-1',
        storage_path: 'case-5/ev-1/statement.pdf',
        mime_type: 'application/pdf',
        evidence_type: 'bank_statement',
        created_at: '2026-01-01T00:00:00.000Z',
        sha256: 'f'.repeat(64),
      },
    ];

    const first = await runEvidenceBundle({ case_id: 'case-5', case_public_id: 'LL-5', evidence });
    const second = await runEvidenceBundle({ case_id: 'case-5', case_public_id: 'LL-5', evidence });

    expect(first.output.manifest_sha256).toBe(second.output.manifest_sha256);
  });

  it('produces a different manifest_sha256 when the evidence set changes', async () => {
    storageDownloadMock.mockResolvedValue(downloadResult(tinyPdf));
    const { runEvidenceBundle } = await importRunner();
    const base = {
      id: 'ev-1',
      storage_path: 'case-6/ev-1/statement.pdf',
      mime_type: 'application/pdf' as const,
      evidence_type: 'bank_statement',
      created_at: '2026-01-01T00:00:00.000Z',
      sha256: 'a'.repeat(64),
    };

    const first = await runEvidenceBundle({ case_id: 'case-6', case_public_id: 'LL-6', evidence: [base] });
    const second = await runEvidenceBundle({
      case_id: 'case-6',
      case_public_id: 'LL-6',
      evidence: [base, { ...base, id: 'ev-2', sha256: 'b'.repeat(64) }],
    });

    expect(first.output.manifest_sha256).not.toBe(second.output.manifest_sha256);
  });

  it('throws a clear error for an evidence item with an unsupported mime type, without downloading it', async () => {
    const { runEvidenceBundle } = await importRunner();

    await expect(
      runEvidenceBundle({
        case_id: 'case-7',
        case_public_id: 'LL-7',
        evidence: [
          {
            id: 'ev-1',
            storage_path: 'case-7/ev-1/weird.gif',
            mime_type: 'image/gif',
            evidence_type: 'other',
            created_at: '2026-01-01T00:00:00.000Z',
            sha256: 'g'.repeat(64),
          },
        ],
      }),
    ).rejects.toThrow(/evidence_bundle_unsupported_mime/);
    expect(storageDownloadMock).not.toHaveBeenCalled();
  });

  it('throws a clear error when the storage download fails', async () => {
    storageDownloadMock.mockResolvedValue({ data: null, error: new Error('not found') });
    const { runEvidenceBundle } = await importRunner();

    await expect(
      runEvidenceBundle({
        case_id: 'case-8',
        case_public_id: 'LL-8',
        evidence: [
          {
            id: 'ev-1',
            storage_path: 'case-8/ev-1/missing.pdf',
            mime_type: 'application/pdf',
            evidence_type: 'bank_statement',
            created_at: '2026-01-01T00:00:00.000Z',
            sha256: 'h'.repeat(64),
          },
        ],
      }),
    ).rejects.toThrow(/evidence_bundle_download_failed/);
  });

  it('throws a clear error when an evidence row has a null mime_type, without downloading it', async () => {
    const { runEvidenceBundle } = await importRunner();

    await expect(
      runEvidenceBundle({
        case_id: 'case-9',
        case_public_id: 'LL-9',
        evidence: [
          {
            id: 'ev-1',
            storage_path: 'case-9/ev-1/unknown',
            mime_type: null,
            evidence_type: 'other',
            created_at: '2026-01-01T00:00:00.000Z',
            sha256: 'i'.repeat(64),
          },
        ],
      }),
    ).rejects.toThrow(/evidence_bundle_unsupported_mime/);
    expect(storageDownloadMock).not.toHaveBeenCalled();
  });
});

describe('applyEvidenceBundleSideEffects', () => {
  beforeEach(() => {
    fromMock.mockReset();
    storageUploadMock.mockReset();
    swarmEventMock.mockReset();
  });

  it('skips all writes and appends a skipped swarm event when there is nothing to seal', async () => {
    const { applyEvidenceBundleSideEffects } = await importRunner();

    const result = await applyEvidenceBundleSideEffects(
      { case_id: 'case-1', case_public_id: 'LL-1', evidence: [] },
      { output: { manifest: [], manifest_sha256: null, sealed_content_path: null, evidence_count: 0, human_review_required: true }, pdfBytes: null },
    );

    expect(result).toEqual({ audit_seal_id: null, sealed_content_path: null });
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(swarmEventMock).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: 'evidence.bundle_skipped' }),
    );
  });

  it('uploads the sealed PDF, inserts audit_seals, updates evidence.bundle_id, and merges cases.metadata_json', async () => {
    const insertAuditSealMock = vi.fn().mockReturnValue({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'seal-1' }, error: null }) }),
    });
    const updateEvidenceMock = vi.fn().mockReturnValue({ in: () => Promise.resolve({ data: null, error: null }) });
    const caseSelectMock = vi.fn().mockReturnValue({
      eq: () => ({
        maybeSingle: () => Promise.resolve({ data: { metadata_json: { existing_key: 'keep-me' } }, error: null }),
      }),
    });
    const updateCaseMock = vi.fn().mockReturnValue({ eq: () => Promise.resolve({ data: null, error: null }) });

    fromMock.mockImplementation((table: string) => {
      if (table === 'audit_seals') return { insert: insertAuditSealMock };
      if (table === 'evidence') return { update: updateEvidenceMock };
      if (table === 'cases') return { select: caseSelectMock, update: updateCaseMock };
      throw new Error(`unexpected table: ${table}`);
    });
    storageUploadMock.mockResolvedValue({ data: { path: 'case-1/abc.pdf' }, error: null });

    const { applyEvidenceBundleSideEffects } = await importRunner();
    const input = {
      case_id: 'case-1',
      case_public_id: 'LL-1',
      evidence: [
        {
          id: 'ev-1',
          storage_path: 'case-1/ev-1/statement.pdf',
          mime_type: 'application/pdf',
          evidence_type: 'bank_statement',
          created_at: '2026-01-01T00:00:00.000Z',
          sha256: 'a'.repeat(64),
        },
      ],
    };
    const manifestSha256 = 'b'.repeat(64);
    const result = await applyEvidenceBundleSideEffects(input, {
      output: {
        manifest: [
          { path: 'case-1/ev-1/statement.pdf', sha256: 'a'.repeat(64), evidence_type: 'bank_statement', uploaded_at: '2026-01-01T00:00:00.000Z' },
        ],
        manifest_sha256: manifestSha256,
        sealed_content_path: `case-1/${manifestSha256}.pdf`,
        evidence_count: 1,
        human_review_required: false,
      },
      pdfBytes: new Uint8Array([1, 2, 3]),
    });

    expect(storageUploadMock).toHaveBeenCalledWith(
      `case-1/${manifestSha256}.pdf`,
      expect.any(Uint8Array),
      { contentType: 'application/pdf', upsert: true },
    );
    expect(insertAuditSealMock).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: 'case-1',
        seal_type: 'evidence_bundle',
        manifest_sha256: manifestSha256,
        sealed_content_bucket: 'bundles',
        sealed_by_type: 'system',
      }),
    );
    expect(updateEvidenceMock).toHaveBeenCalledWith(
      expect.objectContaining({ bundle_id: 'seal-1' }),
    );
    expect(updateCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata_json: expect.objectContaining({
          existing_key: 'keep-me',
          bundle_sha256: manifestSha256,
          bundle_id: 'seal-1',
        }),
      }),
    );
    expect(result).toEqual({ audit_seal_id: 'seal-1', sealed_content_path: `case-1/${manifestSha256}.pdf` });
    expect(swarmEventMock).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'evidence.bundled' }));
  });
});

describe('loadEvidenceBundleInput', () => {
  beforeEach(() => {
    fromMock.mockReset();
  });

  it('filters to sha256_verified, non-deleted evidence ordered by created_at ascending', async () => {
    const orderMock = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'ev-1',
          storage_path: 'case-1/ev-1/statement.pdf',
          mime_type: 'application/pdf',
          evidence_type: 'bank_statement',
          created_at: '2026-01-01T00:00:00.000Z',
          sha256: 'a'.repeat(64),
        },
      ],
      error: null,
    });
    const isMock = vi.fn().mockReturnValue({ order: orderMock });
    const notMock = vi.fn().mockReturnValue({ is: isMock });
    const eqEvidenceMock = vi.fn().mockReturnValue({ not: notMock });
    const selectEvidenceMock = vi.fn().mockReturnValue({ eq: eqEvidenceMock });

    const caseMaybeSingleMock = vi.fn().mockResolvedValue({ data: { id: 'case-1', public_id: 'LL-1' }, error: null });
    const caseEqMock = vi.fn().mockReturnValue({ maybeSingle: caseMaybeSingleMock });
    const selectCaseMock = vi.fn().mockReturnValue({ eq: caseEqMock });

    fromMock.mockImplementation((table: string) => {
      if (table === 'cases') return { select: selectCaseMock };
      if (table === 'evidence') return { select: selectEvidenceMock };
      throw new Error(`unexpected table: ${table}`);
    });

    const { loadEvidenceBundleInput } = await importRunner();
    const result = await loadEvidenceBundleInput('case-1');

    expect(eqEvidenceMock).toHaveBeenCalledWith('case_id', 'case-1');
    expect(notMock).toHaveBeenCalledWith('sha256_verified_at', 'is', null);
    expect(isMock).toHaveBeenCalledWith('deleted_at', null);
    expect(orderMock).toHaveBeenCalledWith('created_at', { ascending: true });
    expect(result.case_id).toBe('case-1');
    expect(result.case_public_id).toBe('LL-1');
    expect(result.evidence).toHaveLength(1);
  });

  it('throws when the case does not exist', async () => {
    const caseMaybeSingleMock = vi.fn().mockResolvedValue({ data: null, error: null });
    fromMock.mockImplementation((table: string) => {
      if (table === 'cases') return { select: () => ({ eq: () => ({ maybeSingle: caseMaybeSingleMock }) }) };
      throw new Error(`unexpected table: ${table}`);
    });

    const { loadEvidenceBundleInput } = await importRunner();
    await expect(loadEvidenceBundleInput('missing-case')).rejects.toThrow(/case_not_found/);
  });
});
