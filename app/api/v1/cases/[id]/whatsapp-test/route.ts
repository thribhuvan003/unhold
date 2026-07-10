import { NextRequest } from 'next/server';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { sendWhatsApp } from '@/lib/messaging/whatsapp';
import { ApiError } from '@/lib/api/errors';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { enforceCaseRecoverLimit } from '@/lib/ratelimit';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Send ONE test WhatsApp to the number already saved on this case
 * (reminder_whatsapp_e164). Proves Twilio is connected. User-only.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireRequestAuth(request);
    await assertCaseAccess(caseId, auth, 'owner');

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    await enforceCaseRecoverLimit(`wa-test:${ip}:${caseId}`);

    const admin = createAdminClient();
    const { data: caseRow } = await admin
      .from('cases')
      .select('intake_json, public_id')
      .eq('id', caseId)
      .maybeSingle();

    if (!caseRow) throw new ApiError(404, 'not_found', 'Case not found');

    const intake =
      typeof caseRow.intake_json === 'object' && caseRow.intake_json !== null
        ? (caseRow.intake_json as Record<string, unknown>)
        : {};
    const e164 =
      typeof intake.reminder_whatsapp_e164 === 'string'
        ? intake.reminder_whatsapp_e164.trim()
        : '';
    const opted = intake.reminder_whatsapp_opt_in === true;

    if (!opted || !e164) {
      throw new ApiError(
        400,
        'validation_failed',
        'Save WhatsApp reminders on first (opt-in + mobile), then test.',
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
    const body = [
      'Unhold — Twilio connection test ✓',
      caseRow.public_id ? `Case: ${caseRow.public_id}` : null,
      'If you got this, WhatsApp reminders can reach you.',
      appUrl ? `Open: ${appUrl}/cases/${caseId}` : null,
      '',
      'We never message your bank. Only you.',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await sendWhatsApp({ toE164: e164, body });
    if (!result.sent) {
      throw new ApiError(
        503,
        'internal_error',
        result.skipped === 'not_configured'
          ? 'Twilio is not connected: set TWILIO_AUTH_TOKEN in .env.local and restart pnpm dev.'
          : `WhatsApp send failed (${result.skipped}). Join the sandbox first, then retry within 24h of messaging the sandbox.`,
      );
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.whatsapp_test_sent',
      payload: { sid: result.sid, to_last4: e164.slice(-4) },
      requestId,
    });

    const response = jsonSuccess({ sent: true, sid: result.sid });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
