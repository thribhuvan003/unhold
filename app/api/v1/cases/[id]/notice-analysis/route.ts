import { z } from 'zod';
import type { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { enforceNoticeAnalysisLimit } from '@/lib/ratelimit';
import { hasGrantedConsent } from '@/lib/consent/record';
import { analyzeNotice } from '@/lib/agents/notice/runner';
import type { NoticeAnalysisOutput } from '@/lib/agents/schemas';
import { appendActionLog } from '@/lib/action-logs/append';
import { appendSwarmEvent } from '@/lib/swarm/append-event';
import { createAdminClient } from '@/lib/supabase/admin';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess, parseJsonBody } from '@/lib/api/response';
import type { Database, Json } from '@/supabase/database.types';

type RouteContext = { params: Promise<{ id: string }> };

const BodySchema = z
  .object({
    input_kind: z.enum(['image', 'text']),
    evidence_id: z.string().uuid().optional(),
    pasted_text: z.string().max(20000).optional(),
  })
  .refine((b) => (b.input_kind === 'image' ? !!b.evidence_id : !!b.pasted_text?.trim()), {
    message: 'image requires evidence_id; text requires pasted_text',
  });

/**
 * FreezeReasonSchema (Zod) uses `tax_attachment`; the Postgres enum uses
 * `tax_gst_attachment` (migration 001). Map at the DB boundary so the insert's
 * enum cast does not fail. All other values are identical.
 */
type DbFreezeReason = Database['public']['Enums']['freeze_reason'];
function toDbFreezeReason(reason: NoticeAnalysisOutput['freeze_reason']): DbFreezeReason {
  return reason === 'tax_attachment' ? 'tax_gst_attachment' : (reason as DbFreezeReason);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'editor');
    await enforceNoticeAnalysisLimit(caseId);

    const body = BodySchema.parse(await parseJsonBody(request, requestId));

    const admin = createAdminClient();

    // Independent pre-analysis reads run in parallel — each Supabase round trip
    // costs a full network RTT, so serializing them was pure added latency.
    const [consentGranted, caseRowResult, evidenceResult] = await Promise.all([
      hasGrantedConsent(caseId, 'ai_ocr_processing'),
      admin.from('cases').select('frozen_amount_paise').eq('id', caseId).maybeSingle(),
      body.input_kind === 'image'
        ? admin
            .from('evidence')
            .select('id, case_id, storage_path, mime_type')
            .eq('id', body.evidence_id!)
            .maybeSingle()
        : Promise.resolve(null),
    ]);

    // Fail closed: notice content must not reach the third-party AI without consent.
    if (!consentGranted) {
      throw new ApiError(422, 'guard_failed', 'AI analysis consent required', {
        guard: 'ai_ocr_processing_consent',
      });
    }

    let storagePath: string | null = null;
    let mimeType: string | null = null;
    if (body.input_kind === 'image') {
      const evidence = evidenceResult?.data;
      if (evidenceResult?.error || !evidence || evidence.case_id !== caseId) {
        throw new ApiError(404, 'not_found', 'Evidence not found for this case');
      }
      storagePath = evidence.storage_path;
      mimeType = evidence.mime_type;
    }

    const caseRow = caseRowResult.data;

    const analysis = await analyzeNotice({
      case_id: caseId,
      input_kind: body.input_kind,
      storage_path: storagePath,
      mime_type: mimeType,
      pasted_text: body.pasted_text ?? null,
      frozen_amount_paise: caseRow?.frozen_amount_paise ?? null,
    });

    // Advisory feature: a failed analysis is not an error — the user falls back
    // to filling the intake form manually.
    if (!analysis) {
      await appendSwarmEvent({
        case_id: caseId,
        agent_role: 'INTAKE',
        event_type: 'notice.analysis_unavailable',
        severity: 'info',
        message: 'Notice analysis could not be completed; manual intake available',
      });
      const fallback = jsonSuccess({ analysis: null, analysis_id: null });
      fallback.headers.set('x-request-id', requestId);
      return fallback;
    }

    const insertRow: Database['public']['Tables']['notice_analysis']['Insert'] = {
      case_id: caseId,
      input_kind: body.input_kind,
      evidence_id: body.evidence_id ?? null,
      freeze_reason: toDbFreezeReason(analysis.freeze_reason),
      severity: analysis.severity,
      confidence: analysis.confidence,
      plain_english: analysis.plain_english,
      what_this_means: analysis.what_this_means,
      suggested_next: analysis.suggested_next,
      extracted_amount_paise: analysis.extracted.amount_paise ?? null,
      extracted_reference: analysis.extracted.reference ?? null,
      raw_output_json: analysis as unknown as Json,
      human_review_required: analysis.human_review_required,
    };

    const { data: inserted, error: insertError } = await admin
      .from('notice_analysis')
      .insert(insertRow)
      .select('id')
      .single();

    if (insertError || !inserted) {
      throw insertError ?? new ApiError(500, 'internal_error', 'Failed to store analysis');
    }

    // Independent audit appends — write them in parallel (both still awaited).
    await Promise.all([
      appendSwarmEvent({
        case_id: caseId,
        agent_role: 'INTAKE',
        event_type: 'notice.analyzed',
        severity: analysis.human_review_required ? 'human_required' : 'info',
        message: `Freeze notice analyzed (${analysis.severity}, confidence ${analysis.confidence.toFixed(2)})`,
        metadata: {
          notice_analysis_id: inserted.id,
          freeze_reason: analysis.freeze_reason,
          severity: analysis.severity,
          confidence: analysis.confidence,
        },
      }),
      appendActionLog({
        caseId,
        actorType: auth.actorType,
        actorId: auth.actorId,
        action: 'notice.analyzed',
        payload: {
          notice_analysis_id: inserted.id,
          input_kind: body.input_kind,
          severity: analysis.severity,
        },
        requestId,
      }),
    ]);

    const response = jsonSuccess({ analysis, analysis_id: inserted.id });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
