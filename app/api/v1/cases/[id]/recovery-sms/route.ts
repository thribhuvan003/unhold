import { NextRequest } from 'next/server';
import { z } from 'zod';
import { assertCaseAccess, requireRequestAuth } from '@/lib/api/case-access';
import { createAdminClient } from '@/lib/supabase/admin';
import { appendActionLog } from '@/lib/action-logs/append';
import { normalizeIndiaMobile } from '@/lib/messaging/whatsapp';
import { sendSms } from '@/lib/messaging/sms';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';
import { enforceCaseRecoverLimit } from '@/lib/ratelimit';

type RouteContext = { params: Promise<{ id: string }> };

const schema = z.object({
  phone: z.string().min(10).max(20),
  /** One-time plaintext recovery code — only the user still has it (from save screen). */
  recovery_code: z.string().min(6).max(16),
  public_id: z.string().min(3).max(32),
});

/**
 * SMS the user their own recovery codes (they already saw them once).
 * Does NOT re-issue or reveal a code from the server hash.
 * Rate-limited. User-only — never bank.
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
    await enforceCaseRecoverLimit(`sms:${ip}`);

    const body = await parseJsonBody(request, requestId);
    const parsed = schema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', parsed.error.issues[0]?.message ?? 'Invalid body');
    }

    const e164 = normalizeIndiaMobile(parsed.data.phone);
    if (!e164) {
      throw new ApiError(400, 'validation_failed', 'Enter a valid 10-digit Indian mobile');
    }

    const admin = createAdminClient();
    const { data: caseRow } = await admin
      .from('cases')
      .select('id, public_id')
      .eq('id', caseId)
      .maybeSingle();

    if (!caseRow || caseRow.public_id !== parsed.data.public_id.trim().toUpperCase()) {
      throw new ApiError(404, 'not_found', 'Case not found');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://www.unhold.live';
    const text = [
      'Unhold — save these codes to reopen your case:',
      `Case: ${caseRow.public_id}`,
      `Recovery: ${parsed.data.recovery_code.trim().toUpperCase()}`,
      `Open: ${appUrl}/open-case`,
      'Never share with anyone claiming to unfreeze your account.',
    ].join('\n');

    const result = await sendSms(e164, text);
    if (!result.sent) {
      throw new ApiError(
        503,
        'internal_error',
        result.skipped === 'not_configured'
          ? 'SMS is not configured yet. Write down your codes on paper.'
          : 'SMS could not be sent (trial numbers must be verified in Twilio). Write codes down.',
      );
    }

    await appendActionLog({
      caseId,
      actorType: auth.actorType,
      actorId: auth.actorId,
      action: 'case.recovery_sms_sent',
      payload: { to_last4: e164.slice(-4) },
      requestId,
    });

    const response = jsonSuccess({ sent: true });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
