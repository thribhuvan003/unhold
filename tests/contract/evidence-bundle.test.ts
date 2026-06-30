import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/cases/[id]/evidence/bundle/route';
import { signGuestToken } from '@/lib/auth/guest';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';

const caseId = '22222222-2222-4222-8222-222222222222';
const userId = '55555555-5555-4555-8555-555555555555';
const guestSessionId = '11111111-1111-4111-8111-111111111111';

const userIdRef: { current: string | null } = { current: null };
const caseRowRef: {
  current: { id: string; user_id: string | null; guest_session_id: string | null; public_id: string; metadata_json: Record<string, unknown> } | null;
} = { current: null };

const evidenceListMock = vi.fn();
const evidenceUpdateInMock = vi.fn();
const auditSealInsertMock = vi.fn();
const actionLogInsertMock = vi.fn();
const storageDownloadMock = vi.fn();
const storageUploadMock = vi.fn();
const storageCreateSignedUrlMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: userIdRef.current ? { id: userIdRef.current } : null } }),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: caseRowRef.current, error: null }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
        };
      }
      if (table === 'evidence') {
        return {
          select: () => ({
            eq: () => ({
              not: () => ({
                is: () => ({
                  order: () => Promise.resolve(evidenceListMock()),
                }),
              }),
            }),
          }),
          update: () => ({ in: () => evidenceUpdateInMock() }),
        };
      }
      if (table === 'audit_seals') {
        return {
          insert: () => ({
            select: () => ({ single: () => Promise.resolve(auditSealInsertMock()) }),
          }),
        };
      }
      if (table === 'action_logs') {
        return { insert: actionLogInsertMock };
      }
      if (table === 'permissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              }),
            }),
          }),
        };
      }
      if (table === 'swarm_events') {
        return {
          insert: () => ({
            select: () => ({ single: () => Promise.resolve({ data: { id: 'event-1' }, error: null }) }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    storage: {
      from: () => ({
        download: () => Promise.resolve(storageDownloadMock()),
        upload: () => Promise.resolve(storageUploadMock()),
        createSignedUrl: () => Promise.resolve(storageCreateSignedUrlMock()),
      }),
    },
  }),
}));

function postRequest(headers?: Record<string, string>) {
  return new NextRequest(`http://localhost/api/v1/cases/${caseId}/evidence/bundle`, {
    method: 'POST',
    headers,
  });
}

function guestHeaders() {
  return { 'X-Guest-Token': signGuestToken(guestSessionId) };
}

describe('POST /cases/:id/evidence/bundle', () => {
  beforeEach(() => {
    userIdRef.current = null;
    caseRowRef.current = null;
    evidenceListMock.mockReset();
    evidenceUpdateInMock.mockReset().mockResolvedValue({ data: null, error: null });
    auditSealInsertMock.mockReset();
    actionLogInsertMock.mockReset().mockResolvedValue({ error: null });
    storageDownloadMock.mockReset();
    storageUploadMock.mockReset().mockResolvedValue({ data: { path: 'sealed.pdf' }, error: null });
    storageCreateSignedUrlMock.mockReset().mockResolvedValue({
      data: { signedUrl: 'https://storage/bundle.pdf?sig=abc' },
      error: null,
    });
  });

  it('returns 401 with no auth at all', async () => {
    const request = postRequest();
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(401);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it('allows a guest who owns the case (editor access) — 422 when there is no evidence, like the owner', async () => {
    // Product decision: bundling uses 'editor' access (matches upload-url/confirm),
    // so a guest can bundle their OWN case from the workspace. Empty case → 422.
    caseRowRef.current = {
      id: caseId,
      user_id: null,
      guest_session_id: guestSessionId,
      public_id: 'LL-10001',
      metadata_json: {},
    };
    evidenceListMock.mockReturnValue({ data: [], error: null });
    const request = postRequest(guestHeaders());
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json.error.guard).toBe('evidence_bundle_nonempty');
    expect(storageUploadMock).not.toHaveBeenCalled();
  });

  it('returns 403 for a guest whose session does NOT own the case', async () => {
    caseRowRef.current = {
      id: caseId,
      user_id: null,
      guest_session_id: '99999999-9999-4999-8999-999999999999',
      public_id: 'LL-10001',
      metadata_json: {},
    };
    const request = postRequest(guestHeaders());
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(403);
    expect(errorEnvelopeSchema.safeParse(await response.json()).success).toBe(true);
  });

  it('returns 403 when the authenticated user does not own the case', async () => {
    userIdRef.current = userId;
    caseRowRef.current = {
      id: caseId,
      user_id: 'someone-else',
      guest_session_id: null,
      public_id: 'LL-10001',
      metadata_json: {},
    };
    const request = postRequest();
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown case', async () => {
    userIdRef.current = userId;
    caseRowRef.current = null;
    const request = postRequest();
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(404);
  });

  it('returns 422 guard_failed when the case has zero eligible evidence, without uploading or sealing anything', async () => {
    userIdRef.current = userId;
    caseRowRef.current = {
      id: caseId,
      user_id: userId,
      guest_session_id: null,
      public_id: 'LL-10001',
      metadata_json: {},
    };
    evidenceListMock.mockReturnValue({ data: [], error: null });

    const request = postRequest();
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();

    expect(response.status).toBe(422);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.error.guard).toBe('evidence_bundle_nonempty');
    expect(storageUploadMock).not.toHaveBeenCalled();
    expect(auditSealInsertMock).not.toHaveBeenCalled();
  });

  it('seals the bundle and returns a signed download URL for the owning user', async () => {
    userIdRef.current = userId;
    caseRowRef.current = {
      id: caseId,
      user_id: userId,
      guest_session_id: null,
      public_id: 'LL-10001',
      metadata_json: { existing_key: 'keep-me' },
    };
    evidenceListMock.mockReturnValue({
      data: [
        {
          id: 'ev-1',
          storage_path: `${caseId}/ev-1/statement.pdf`,
          mime_type: 'application/pdf',
          evidence_type: 'bank_statement',
          created_at: '2026-01-01T00:00:00.000Z',
          sha256: 'a'.repeat(64),
        },
      ],
      error: null,
    });
    storageDownloadMock.mockReturnValue({
      data: {
        arrayBuffer: async () => {
          const { PDFDocument } = await import('pdf-lib');
          const doc = await PDFDocument.create();
          doc.addPage([50, 50]);
          const bytes = await doc.save();
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        },
      },
      error: null,
    });
    auditSealInsertMock.mockReturnValue({ data: { id: 'seal-1' }, error: null });

    const request = postRequest();
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.manifest_sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(json.evidence_count).toBe(1);
    expect(json.download_url).toBe('https://storage/bundle.pdf?sig=abc');
    expect(json.expires_at).toBeTruthy();
    expect(storageUploadMock).toHaveBeenCalledTimes(1);
    expect(auditSealInsertMock).toHaveBeenCalledTimes(1);
    expect(evidenceUpdateInMock).toHaveBeenCalledTimes(1);
    expect(actionLogInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'evidence.bundle_generated' }),
    );
  });
});
