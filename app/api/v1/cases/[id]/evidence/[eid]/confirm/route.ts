import { NextRequest, after } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { enqueueAgentJob } from '@/lib/jobs/enqueue';
import { processAgentJobs } from '@/lib/jobs/process';
import { isValidSha256 } from '@/lib/evidence/sha256';
import { EVIDENCE_BUCKET, MAX_EVIDENCE_BYTES } from '@/lib/evidence/storage-path';
import { detectEvidenceMime, evidenceMimeMatches } from '@/lib/evidence/file-signature';
import { evidenceConfirmSchema } from '@/lib/validation/api-schemas';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { tryAutoTransitionOnEvidence } from '@/lib/state-machine/transitions';
import { ApiError } from '@/lib/api/errors';
import type { Database } from '@/supabase/database.types';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string; eid: string }> };
type AgentJobRow = Database['public']['Tables']['agent_jobs']['Row'];

async function rejectUploadedObject(input: {
  admin: ReturnType<typeof createAdminClient>;
  caseId: string;
  evidenceId: string;
  storagePath: string;
  message: string;
}): Promise<never> {
  await input.admin.storage.from(EVIDENCE_BUCKET).remove([input.storagePath]);
  await input.admin
    .from('evidence')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.evidenceId)
    .eq('case_id', input.caseId);
  throw new ApiError(422, 'guard_failed', input.message, { guard: 'evidence_file_valid' });
}

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
      .select(
        'id, case_id, storage_path, storage_bucket, mime_type, file_size_bytes, sha256, sha256_verified_at, deleted_at',
      )
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

    if (
      evidence.storage_bucket !== EVIDENCE_BUCKET ||
      fileData.size <= 0 ||
      fileData.size > MAX_EVIDENCE_BYTES ||
      fileData.size !== evidence.file_size_bytes
    ) {
      return rejectUploadedObject({
        admin,
        caseId,
        evidenceId,
        storagePath: evidence.storage_path,
        message: 'Uploaded file size does not match the requested upload',
      });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const detectedMime = detectEvidenceMime(buffer);
    if (!evidenceMimeMatches(evidence.mime_type, detectedMime)) {
      return rejectUploadedObject({
        admin,
        caseId,
        evidenceId,
        storagePath: evidence.storage_path,
        message: 'Uploaded file content does not match its file type',
      });
    }

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

    // Verify THIS document now, bounded, before responding — so its
    // vision_confidence is written and the letter/paper gates act on a real
    // verdict. The previous approach enqueued a job and drained the queue
    // oldest-first via `after()`; behind any backlog a fresh upload was skipped,
    // leaving null confidence, which the gates treat as "trusted" — letting
    // blank/unreadable files through. If the inline run fails or times out, we
    // fall back to the durable queue + cron sweeper.
    let verifiedInline = false;
    try {
      const { runVerifierJob } = await import('@/lib/agents/verifier/runner');
      await Promise.race([
        runVerifierJob({
          id: `inline:${evidenceId}`,
          payload_json: { case_id: caseId, evidence_id: evidenceId },
        } as unknown as AgentJobRow),
        new Promise((_, reject) => setTimeout(() => reject(new Error('verify_timeout')), 20_000)),
      ]);
      verifiedInline = true;
    } catch {
      // fall through to the durable queue path below
    }

    if (!verifiedInline) {
      try {
        await enqueueAgentJob({
          case_id: caseId,
          job_type: 'verifier_extract',
          agent_role: 'VERIFIER',
          idempotency_key: `verifier:${evidenceId}:confirm`,
          payload: { case_id: caseId, evidence_id: evidenceId },
        });
      } catch {
        // Best-effort: the cron sweeper will enqueue via the router instead.
      }
      try {
        after(async () => {
          try {
            await processAgentJobs({ limit: 5 });
          } catch {
            // Job stays pending for the cron sweeper.
          }
        });
      } catch {
        // No request scope (direct invocation in tests) — cron sweeper handles it.
      }
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
