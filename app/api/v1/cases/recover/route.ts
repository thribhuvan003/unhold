import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  GUEST_COOKIE_NAME,
  guestCookieOptions,
  hashDeviceToken,
  signGuestToken,
} from '@/lib/auth/guest';
import {
  isValidPublicId,
  readRecoveryHash,
  verifyRecoveryCode,
} from '@/lib/auth/recovery';
import { appendActionLog } from '@/lib/action-logs/append';
import { ApiError } from '@/lib/api/errors';
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
  parseJsonBody,
} from '@/lib/api/response';
import { enforceCaseRecoverLimit } from '@/lib/ratelimit';
import { createAdminClient } from '@/lib/supabase/admin';

const recoverSchema = z.object({
  public_id: z.string().min(3).max(32),
  recovery_code: z.string().min(6).max(16),
});

/**
 * Re-open a guest-owned case from a new browser using public_id + recovery code.
 * Rotates the guest device token and sets the guest cookie.
 */
export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    await enforceCaseRecoverLimit(ip);

    const body = await parseJsonBody(request, requestId);
    const parsed = recoverSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'validation_failed', 'Invalid recovery request');
    }

    const publicId = parsed.data.public_id.trim().toUpperCase();
    if (!isValidPublicId(publicId)) {
      // Generic error — do not confirm whether the public_id exists.
      throw new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    await enforceCaseRecoverLimit(`${ip}:${publicId}`);

    const admin = createAdminClient();
    const { data: caseRow, error } = await admin
      .from('cases')
      .select('id, user_id, guest_session_id, metadata_json, public_id')
      .eq('public_id', publicId)
      .maybeSingle();

    if (error || !caseRow) {
      throw new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    if (caseRow.user_id) {
      throw new ApiError(
        409,
        'conflict',
        'This case is linked to an account. Sign in to open it.',
      );
    }

    if (!caseRow.guest_session_id) {
      throw new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    const meta =
      typeof caseRow.metadata_json === 'object' && caseRow.metadata_json !== null
        ? (caseRow.metadata_json as Record<string, unknown>)
        : {};
    const expectedHash = readRecoveryHash(meta);
    if (!expectedHash || !verifyRecoveryCode(parsed.data.recovery_code, expectedHash)) {
      throw new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    const { data: guestSession, error: guestError } = await admin
      .from('guest_sessions')
      .select('id, expires_at, claimed_by, revoked_at')
      .eq('id', caseRow.guest_session_id)
      .maybeSingle();

    if (guestError || !guestSession || guestSession.claimed_by || guestSession.revoked_at) {
      throw new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    const expiresAt = new Date(guestSession.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      throw new ApiError(401, 'unauthorized', 'This guest session has expired. Start a new case.');
    }

    // Rotate device token for the existing guest session (same sub = same ownership).
    const deviceToken = signGuestToken(guestSession.id);
    const { data: updatedSession, error: tokenUpdateError } = await admin
      .from('guest_sessions')
      .update({
        device_token_hash: hashDeviceToken(deviceToken),
        rotated_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', guestSession.id)
      .is('claimed_by', null)
      .is('revoked_at', null)
      .select('id')
      .maybeSingle();

    if (tokenUpdateError || !updatedSession) {
      throw tokenUpdateError ?? new ApiError(401, 'unauthorized', 'Could not open that case. Check the codes and try again.');
    }

    await appendActionLog({
      caseId: caseRow.id,
      actorType: 'guest',
      actorId: guestSession.id,
      action: 'case.recovered',
      payload: { public_id: caseRow.public_id },
      requestId,
    });

    const response = jsonSuccess({
      case_id: caseRow.id,
      public_id: caseRow.public_id,
      guest_session_id: guestSession.id,
    });
    response.cookies.set(GUEST_COOKIE_NAME, deviceToken, guestCookieOptions(expiresAt));
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
