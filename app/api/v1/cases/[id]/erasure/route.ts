import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { requireDirectCaseOwner } from '@/lib/api/case-access';
import { GUEST_COOKIE_NAME, guestCookieOptions } from '@/lib/auth/guest';
import { recordConsent } from '@/lib/consent/record';
import {
  ERASURE_CAPABILITY_GRACE_MS,
  processCaseErasure,
} from '@/lib/data-rights/erasure';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/supabase/database.types';

const ParamsSchema = z.object({ id: z.string().uuid() });
const BodySchema = z.object({ confirm_case_id: z.string().min(1).max(40) });

function clearReminderData(value: unknown): Record<string, unknown> {
  const intake = typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
  const rest = { ...intake };
  delete rest.reminder_email;
  delete rest.reminder_opt_in;
  delete rest.reminder_whatsapp_e164;
  delete rest.reminder_whatsapp_opt_in;
  delete rest.reminder_sent_due_at;
  delete rest.reminder_send_claimed_at;
  return rest;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  try {
    const { id } = ParamsSchema.parse(await context.params);
    const { auth, caseRow } = await requireDirectCaseOwner(request, id);
    const body = BodySchema.parse(await request.json());

    if (body.confirm_case_id !== caseRow.public_id) {
      throw new ApiError(400, 'validation_failed', 'Type the exact case ID to confirm deletion');
    }

    const intake =
      typeof caseRow.intake_json === 'object' && caseRow.intake_json !== null
        ? (caseRow.intake_json as Record<string, unknown>)
        : {};
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const scheduledAt = new Date(Date.now() + ERASURE_CAPABILITY_GRACE_MS).toISOString();

    if (intake.reminder_opt_in === true) {
      await recordConsent({
        consent_type: 'email_reminders',
        granted: false,
        user_id: auth.userId,
        guest_session_id: auth.guestSessionId,
        case_id: id,
        metadata: { reason: 'case_erasure' },
      }).catch(() => undefined);
    }
    if (intake.reminder_whatsapp_opt_in === true) {
      await recordConsent({
        consent_type: 'whatsapp_sms_reminders',
        granted: false,
        user_id: auth.userId,
        guest_session_id: auth.guestSessionId,
        case_id: id,
        metadata: { reason: 'case_erasure' },
      }).catch(() => undefined);
    }

    const { data: requested, error: requestError } = await admin
      .from('cases')
      .update({
        erasure_requested_at: now,
        erasure_scheduled_at: scheduledAt,
        swarm_paused: true,
        next_check_at: null,
        next_user_action_due_at: null,
        user_action_required: false,
        intake_json: clearReminderData(intake) as Json,
      })
      .eq('id', id)
      .is('erasure_requested_at', null)
      .select('id')
      .maybeSingle();

    if (requestError || !requested) {
      throw new ApiError(409, 'conflict', 'Case deletion was already requested');
    }

    await admin
      .from('agent_jobs')
      .update({ status: 'cancelled', completed_at: now })
      .eq('case_id', id)
      .in('status', ['pending', 'failed']);

    try {
      await admin.from('action_logs').insert({
        case_id: id,
        actor_type: auth.actorType,
        actor_id: auth.actorId,
        action: 'case.erasure_requested',
        payload_json: {},
        request_id: requestId,
      });
    } catch {
      // The accepted deletion request must not look failed because audit
      // logging is briefly unavailable.
    }

    const status = await processCaseErasure(id);
    const response = jsonSuccess({ status }, { status: status === 'deleted' ? 200 : 202 });

    if (status === 'deleted' && auth.guestSessionId) {
      const { count } = await admin
        .from('cases')
        .select('id', { count: 'exact', head: true })
        .eq('guest_session_id', auth.guestSessionId);
      if ((count ?? 0) === 0) {
        await admin
          .from('guest_sessions')
          .update({ revoked_at: now, revocation_reason: 'last_case_erased' })
          .eq('id', auth.guestSessionId);
        response.cookies.set(GUEST_COOKIE_NAME, '', guestCookieOptions(new Date(0)));
      }
    }

    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
