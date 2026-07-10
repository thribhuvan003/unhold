import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { recordConsent } from '@/lib/consent/record';
import { appendActionLog } from '@/lib/action-logs/append';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizeIndiaMobile } from '@/lib/messaging/whatsapp';
import { ApiError } from '@/lib/api/errors';
import type { Json } from '@/supabase/database.types';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';

type RouteContext = { params: Promise<{ id: string }> };

const reminderOptInSchema = z
  .object({
    email: z.string().trim().max(254).optional().default(''),
    opt_in: z.boolean().optional().default(false),
    whatsapp: z.string().trim().max(20).optional().default(''),
    whatsapp_opt_in: z.boolean().optional().default(false),
  })
  .superRefine((val, ctx) => {
    if (val.opt_in) {
      const email = val.email?.trim() ?? '';
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid email to turn email reminders on',
          path: ['email'],
        });
      }
    }
    if (val.whatsapp_opt_in) {
      const e164 = normalizeIndiaMobile(val.whatsapp ?? '');
      if (!e164) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Enter a valid 10-digit Indian mobile for WhatsApp',
          path: ['whatsapp'],
        });
      }
    }
  });

/**
 * Opt in / out of deadline reminders (email and/or WhatsApp).
 * USER only — never bank. DPDP consent recorded per channel.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'owner');

    const body = await parseJsonBody(request, requestId);
    const parsed = reminderOptInSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const email = parsed.data.email.trim();
    const emailOptIn = parsed.data.opt_in === true;
    const waE164 = parsed.data.whatsapp_opt_in
      ? normalizeIndiaMobile(parsed.data.whatsapp)
      : null;
    const waOptIn = parsed.data.whatsapp_opt_in === true && Boolean(waE164);

    const admin = createAdminClient();
    const { data: existing, error: fetchError } = await admin
      .from('cases')
      .select('intake_json')
      .eq('id', caseId)
      .single();

    if (fetchError || !existing) {
      throw new ApiError(404, 'not_found', 'Case not found');
    }

    const mergedIntake = {
      ...(existing.intake_json as Record<string, unknown>),
      reminder_email: email || null,
      reminder_opt_in: emailOptIn,
      reminder_whatsapp_e164: waOptIn ? waE164 : null,
      reminder_whatsapp_opt_in: waOptIn,
    };

    const { error: updateError } = await admin
      .from('cases')
      .update({
        intake_json: mergedIntake as Json,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', caseId);

    if (updateError) {
      throw new ApiError(500, 'internal_error', 'Failed to save reminder preference');
    }

    await recordConsent({
      consent_type: 'email_reminders',
      granted: emailOptIn,
      case_id: caseId,
      user_id: auth.userId,
      guest_session_id: auth.userId ? null : auth.guestSessionId,
    });

    await recordConsent({
      consent_type: 'whatsapp_sms_reminders',
      granted: waOptIn,
      case_id: caseId,
      user_id: auth.userId,
      guest_session_id: auth.userId ? null : auth.guestSessionId,
    });

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.reminder_optin_updated',
      payload: {
        email_opt_in: emailOptIn,
        whatsapp_opt_in: waOptIn,
      },
      requestId,
    });

    const response = jsonSuccess({
      opt_in: emailOptIn,
      email: email || null,
      whatsapp_opt_in: waOptIn,
      whatsapp: waOptIn ? waE164 : null,
    });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
