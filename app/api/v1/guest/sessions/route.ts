import { NextRequest } from "next/server";
import {
  GUEST_COOKIE_NAME,
  generateGuestSessionId,
  guestCookieOptions,
  hashDeviceToken,
  signGuestToken,
} from "@/lib/auth/guest";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enforceGuestSessionCreateLimit,
  getClientRateLimitFingerprint,
} from "@/lib/ratelimit";
import {
  getRequestId,
  handleRouteError,
  jsonSuccess,
} from "@/lib/api/response";

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    await enforceGuestSessionCreateLimit(
      getClientRateLimitFingerprint(request),
    );
    const guestSessionId = generateGuestSessionId();
    const deviceToken = signGuestToken(guestSessionId);
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const admin = createAdminClient();
    const { error } = await admin.from("guest_sessions").insert({
      id: guestSessionId,
      device_token_hash: hashDeviceToken(deviceToken),
      expires_at: expiresAt.toISOString(),
    });

    if (error) {
      throw error;
    }

    const response = jsonSuccess({ expires_at: expiresAt.toISOString() });
    response.cookies.set(
      GUEST_COOKIE_NAME,
      deviceToken,
      guestCookieOptions(expiresAt),
    );
    response.headers.set("x-request-id", requestId);
    return response;
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
