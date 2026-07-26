import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as uploadUrl } from "@/app/api/v1/cases/[id]/evidence/upload-url/route";
import { POST as confirm } from "@/app/api/v1/cases/[id]/evidence/[eid]/confirm/route";
import { hashDeviceToken, signGuestToken } from "@/lib/auth/guest";
import { errorEnvelopeSchema } from "@/lib/validation/api-schemas";
import { buildEvidenceStoragePath } from "@/lib/evidence/storage-path";

const caseId = "22222222-2222-4222-8222-222222222222";
const evidenceId = "44444444-4444-4444-8444-444444444444";
const guestSessionId = "11111111-1111-4111-8111-111111111111";
const guestToken = signGuestToken(guestSessionId);

const caseSelectMock = vi.fn();
const evidenceInsertMock = vi.fn();
const evidenceSelectMock = vi.fn();
const evidenceUpdateMock = vi.fn();
const storageCreateMock = vi.fn();
const storageDownloadMock = vi.fn();
const storageRemoveMock = vi.fn();
const appendActionMock = vi.fn();
const tryTransitionMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "guest_sessions") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: guestSessionId,
                    device_token_hash: hashDeviceToken(guestToken),
                    expires_at: "2099-01-01T00:00:00.000Z",
                    claimed_by: null,
                    revoked_at: null,
                  },
                  error: null,
                }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      if (table === "cases") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: caseSelectMock,
              single: caseSelectMock,
            }),
          }),
        };
      }
      if (table === "evidence") {
        return {
          insert: () => ({
            select: () => ({
              single: evidenceInsertMock,
            }),
          }),
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: evidenceSelectMock,
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: evidenceUpdateMock,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "action_logs") {
        return { insert: appendActionMock };
      }
      return {};
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: storageCreateMock,
        download: storageDownloadMock,
        remove: storageRemoveMock,
      }),
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

vi.mock("@/lib/state-machine/transitions", () => ({
  tryAutoTransitionOnEvidence: (...args: unknown[]) =>
    tryTransitionMock(...args),
}));

function guestRequest(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
) {
  const headers = new Headers(options?.headers);
  headers.set("Cookie", `ll_guest=${guestToken}`);
  return new NextRequest(url, {
    method: options?.method,
    headers,
    body: options?.body,
  });
}

describe("evidence upload contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    caseSelectMock.mockResolvedValue({
      data: { id: caseId, user_id: null, guest_session_id: guestSessionId },
      error: null,
    });
    evidenceInsertMock.mockResolvedValue({
      data: {
        id: evidenceId,
        storage_path: buildEvidenceStoragePath(caseId, evidenceId, "stmt.pdf"),
      },
      error: null,
    });
    storageCreateMock.mockResolvedValue({
      data: { signedUrl: "https://storage/upload", token: "tok" },
      error: null,
    });
    appendActionMock.mockResolvedValue({ error: null });
    tryTransitionMock.mockResolvedValue(null);
    storageRemoveMock.mockResolvedValue({ error: null });
  });

  it("POST upload-url returns signed URL and storage path", async () => {
    const request = guestRequest(
      `http://localhost/api/v1/cases/${caseId}/evidence/upload-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence_type: "bank_statement",
          filename: "stmt.pdf",
          mime_type: "application/pdf",
          file_size_bytes: 1024,
        }),
      },
    );

    const response = await uploadUrl(request, {
      params: Promise.resolve({ id: caseId }),
    });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.storage_path).toBe(`${caseId}/${evidenceId}/stmt.pdf`);
    expect(json.upload_url).toBeTruthy();
  });

  it("rejects unsupported mime type", async () => {
    const request = guestRequest(
      `http://localhost/api/v1/cases/${caseId}/evidence/upload-url`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidence_type: "other",
          filename: "x.exe",
          mime_type: "application/octet-stream",
          file_size_bytes: 10,
        }),
      },
    );
    const response = await uploadUrl(request, {
      params: Promise.resolve({ id: caseId }),
    });
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it("POST confirm verifies sha256 and triggers transition attempt", async () => {
    const sha =
      "86edbaa24831badfa0a8b04bb410141e2ee4182b6d0014493fe262a7a331c20b";
    evidenceSelectMock.mockResolvedValue({
      data: {
        id: evidenceId,
        case_id: caseId,
        evidence_type: "bank_statement",
        storage_path: `${caseId}/${evidenceId}/empty.pdf`,
        storage_bucket: "evidence",
        mime_type: "application/pdf",
        file_size_bytes: 8,
        sha256: "0".repeat(64),
        sha256_verified_at: null,
        deleted_at: null,
      },
      error: null,
    });
    storageDownloadMock.mockResolvedValue({
      data: new Blob([Buffer.from("%PDF-1.7")], { type: "application/pdf" }),
      error: null,
    });
    evidenceUpdateMock.mockResolvedValue({
      data: {
        id: evidenceId,
        case_id: caseId,
        evidence_type: "bank_statement",
        sha256: sha,
        sha256_verified_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const request = guestRequest(
      `http://localhost/api/v1/cases/${caseId}/evidence/${evidenceId}/confirm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sha256: sha }),
      },
    );

    const response = await confirm(request, {
      params: Promise.resolve({ id: caseId, eid: evidenceId }),
    });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.evidence.sha256).toBe(sha);
    expect(tryTransitionMock).toHaveBeenCalled();
  });

  it("replays an already-confirmed matching hash without downloading or verifying again", async () => {
    const sha =
      "86edbaa24831badfa0a8b04bb410141e2ee4182b6d0014493fe262a7a331c20b";
    evidenceSelectMock.mockResolvedValue({
      data: {
        id: evidenceId,
        case_id: caseId,
        evidence_type: "bank_statement",
        storage_path: `${caseId}/${evidenceId}/stmt.pdf`,
        storage_bucket: "evidence",
        mime_type: "application/pdf",
        file_size_bytes: 8,
        sha256: sha,
        sha256_verified_at: "2026-07-14T10:00:00.000Z",
        deleted_at: null,
      },
      error: null,
    });

    const response = await confirm(
      guestRequest(
        `http://localhost/api/v1/cases/${caseId}/evidence/${evidenceId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha256: sha }),
        },
      ),
      { params: Promise.resolve({ id: caseId, eid: evidenceId }) },
    );
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.replayed).toBe(true);
    expect(storageDownloadMock).not.toHaveBeenCalled();
    expect(evidenceUpdateMock).not.toHaveBeenCalled();
    expect(appendActionMock).not.toHaveBeenCalled();
    expect(tryTransitionMock).not.toHaveBeenCalled();
  });

  it("rejects a different hash on an already-confirmed evidence row", async () => {
    const storedSha =
      "86edbaa24831badfa0a8b04bb410141e2ee4182b6d0014493fe262a7a331c20b";
    evidenceSelectMock.mockResolvedValue({
      data: {
        id: evidenceId,
        case_id: caseId,
        evidence_type: "bank_statement",
        storage_path: `${caseId}/${evidenceId}/stmt.pdf`,
        storage_bucket: "evidence",
        mime_type: "application/pdf",
        file_size_bytes: 8,
        sha256: storedSha,
        sha256_verified_at: "2026-07-14T10:00:00.000Z",
        deleted_at: null,
      },
      error: null,
    });

    const response = await confirm(
      guestRequest(
        `http://localhost/api/v1/cases/${caseId}/evidence/${evidenceId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sha256: "1".repeat(64) }),
        },
      ),
      { params: Promise.resolve({ id: caseId, eid: evidenceId }) },
    );

    expect(response.status).toBe(422);
    expect(storageDownloadMock).not.toHaveBeenCalled();
    expect(evidenceUpdateMock).not.toHaveBeenCalled();
  });
});
