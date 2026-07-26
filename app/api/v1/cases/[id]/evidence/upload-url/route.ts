import { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import {
  buildEvidenceStoragePath,
  assertEvidenceUploadConstraints,
  EVIDENCE_BUCKET,
} from '@/lib/evidence/storage-path';
import { evidenceUploadUrlSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const PENDING_SHA256 = '0'.repeat(64);

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'editor');

    const body = await parseJsonBody(request, requestId);
    const parsed = evidenceUploadUrlSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    assertEvidenceUploadConstraints(parsed.data.mime_type, parsed.data.file_size_bytes);

    const admin = createAdminClient();
    const evidenceId = crypto.randomUUID();
    const storagePath = buildEvidenceStoragePath(caseId, evidenceId, parsed.data.filename);

    const { data: evidence, error: insertError } = await admin
      .from('evidence')
      .insert({
        id: evidenceId,
        case_id: caseId,
        evidence_type: parsed.data.evidence_type,
        storage_path: storagePath,
        storage_bucket: EVIDENCE_BUCKET,
        original_filename: parsed.data.filename,
        mime_type: parsed.data.mime_type,
        file_size_bytes: parsed.data.file_size_bytes,
        sha256: PENDING_SHA256,
        uploaded_by: auth.userId,
        guest_session_id: auth.userId ? null : auth.guestSessionId,
      })
      .select('id, storage_path')
      .single();

    if (insertError || !evidence) {
      throw insertError ?? new ApiError(500, 'internal_error', 'Failed to create evidence row');
    }

    const { data: signed, error: signError } = await admin.storage
      .from(EVIDENCE_BUCKET)
      .createSignedUploadUrl(storagePath, { upsert: false });

    if (signError || !signed) {
      throw signError ?? new ApiError(500, 'internal_error', 'Failed to create upload URL');
    }

    const response = jsonSuccess({
      evidence_id: evidence.id,
      upload_url: signed.signedUrl,
      storage_path: evidence.storage_path,
      token: signed.token,
    });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unsupported mime')) {
      return handleRouteError(new ApiError(400, 'validation_failed', error.message), requestId);
    }
    if (error instanceof Error && error.message.startsWith('File size')) {
      return handleRouteError(new ApiError(400, 'validation_failed', error.message), requestId);
    }
    return handleRouteError(error, requestId);
  }
}