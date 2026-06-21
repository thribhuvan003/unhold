import { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { isValidSha256 } from '@/lib/evidence/sha256';
import { EVIDENCE_BUCKET } from '@/lib/evidence/storage-path';
import { evidenceConfirmSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { tryAutoTransitionOnEvidence } from '@/lib/state-machine/transitions';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string; eid: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId, eid: evidenceId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'editor');

    const body = await parseJsonBody(request, requestId);
    const parsed = evidenceConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    if (!isValidSha256(parsed.data.sha256)) {
      throw new ApiError(400, 'validation_failed', 'Invalid SHA-256 hash');
    }

    const admin = createAdminClient();
    const { data: evidence, error: fetchError } = await admin
      .from('evidence')
      .select('id, case_id, storage_path, sha256, sha256_verified_at, deleted_at')
      .eq('id', evidenceId)
      .eq('case_id', caseId)
      .maybeSingle();

    if (fetchError || !evidence || evidence.deleted_at) {
      throw new ApiError(404, 'not_found', 'Evidence not found');
    }

    const { data: fileData, error: downloadError } = await admin.storage
      .from(EVIDENCE_BUCKET)
      .download(evidence.storage_path);

    if (downloadError || !fileData) {
      throw new ApiError(400, 'validation_failed', 'Uploaded file not found in storage');
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const { computeSha256Hex } = await import('@/lib/evidence/sha256');
    const serverHash = computeSha256Hex(buffer);

    if (serverHash !== parsed.data.sha256) {
      throw new ApiError(422, 'guard_failed', 'SHA-256 mismatch', { guard: 'sha256_match' });
    }

    const now = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from('evidence')
      .update({
        sha256: parsed.data.sha256,
        sha256_verified_at: now,
      })
      .eq('id', evidenceId)
      .select('id, case_id, evidence_type, sha256, sha256_verified_at')
      .single();

    if (updateError || !updated) {
      throw updateError ?? new ApiError(500, 'internal_error', 'Failed to confirm evidence');
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'evidence.confirmed',
      payload: { evidence_id: evidenceId, sha256: parsed.data.sha256 },
      requestId,
    });

    let transition = null;
    try {
      transition = await tryAutoTransitionOnEvidence(caseId, auth.actorType, auth.actorId);
    } catch {
      // Transition may fail if guard not yet satisfied; evidence confirm still succeeds
    }

    const response = jsonSuccess({
      evidence: updated,
      transition,
    });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}