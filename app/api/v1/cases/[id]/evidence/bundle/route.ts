import type { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { appendActionLog } from '@/lib/action-logs/append';
import {
  applyEvidenceBundleSideEffects,
  loadEvidenceBundleInput,
  runEvidenceBundle,
} from '@/lib/agents/evidence/runner';
import { BUNDLE_BUCKET } from '@/lib/evidence/storage-path';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    // 'editor' to match the sibling evidence routes (upload-url, confirm) — the
    // BundleButton is guest-facing in the workspace, and a guest bundles only
    // their own case (assertCaseAccess scopes to the case owner/guest).
    await assertCaseAccess(caseId, auth, 'editor');

    const input = await loadEvidenceBundleInput(caseId);
    const result = await runEvidenceBundle(input);

    if (!result.output.sealed_content_path || !result.output.manifest_sha256) {
      throw new ApiError(422, 'guard_failed', 'No verified evidence available to bundle', {
        guard: 'evidence_bundle_nonempty',
      });
    }

    await applyEvidenceBundleSideEffects(input, result);

    const admin = createAdminClient();
    const { data: signed, error: signError } = await admin.storage
      .from(BUNDLE_BUCKET)
      .createSignedUrl(result.output.sealed_content_path, DOWNLOAD_URL_TTL_SECONDS);

    if (signError || !signed) {
      throw signError ?? new ApiError(500, 'internal_error', 'Failed to create download URL');
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'evidence.bundle_generated',
      payload: {
        manifest_sha256: result.output.manifest_sha256,
        evidence_count: result.output.evidence_count,
      },
      requestId,
    });

    const response = jsonSuccess({
      manifest_sha256: result.output.manifest_sha256,
      evidence_count: result.output.evidence_count,
      download_url: signed.signedUrl,
      expires_at: new Date(Date.now() + DOWNLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
