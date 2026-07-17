import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { recordConsent } from '@/lib/consent/record';
import { appendActionLog } from '@/lib/action-logs/append';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const outcomeSchema = z
  .object({
    outcome: z.enum(['unfrozen', 'partially_unfrozen', 'response_received', 'still_frozen']),
    testimonial_opt_in: z.boolean().optional().default(false),
    testimonial_text: z.string().trim().max(600).optional().default(''),
  })
  .superRefine((val, ctx) => {
    if (val.testimonial_text && !val.testimonial_opt_in) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Testimonial text requires the sharing opt-in',
        path: ['testimonial_text'],
      });
    }
  });

/**
 * One-tap, user-reported case outcome (insert-only log; latest wins).
 * Owner-only. Repeat taps of the same outcome are idempotent (unique on
 * case_id+outcome). Testimonials are strictly opt-in and recorded under the
 * existing public_stats_opt_in consent type.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    const access = await assertCaseAccess(caseId, auth, 'editor');
    if (access !== 'owner') {
      throw new ApiError(403, 'forbidden', 'Only the case owner can report an outcome');
    }

    const body = await parseJsonBody(request, requestId);
    const parsed = outcomeSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const { outcome, testimonial_opt_in, testimonial_text } = parsed.data;

    const admin = createAdminClient();
    const { error: insertError } = await admin.from('case_outcomes').upsert(
      {
        case_id: caseId,
        outcome,
        testimonial_opt_in,
        testimonial_text: testimonial_opt_in && testimonial_text ? testimonial_text : null,
      },
      { onConflict: 'case_id,outcome', ignoreDuplicates: true },
    );

    if (insertError) {
      throw new ApiError(500, 'internal_error', 'Failed to record the outcome');
    }

    if (testimonial_opt_in) {
      await recordConsent({
        consent_type: 'public_stats_opt_in',
        granted: true,
        case_id: caseId,
        user_id: auth.userId,
        guest_session_id: auth.userId ? null : auth.guestSessionId,
      });
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.outcome_reported',
      payload: { outcome, testimonial_opt_in },
      requestId,
    });

    return jsonSuccess({ outcome, recorded: true });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
