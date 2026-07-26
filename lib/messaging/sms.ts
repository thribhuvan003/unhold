import "server-only";

/**
 * Twilio SMS — user-only transactional messages (recovery / reminders).
 * Never used to contact banks. Env-gated like email/WhatsApp.
 */

export type SendSmsResult =
  | { sent: true; sid: string }
  | { sent: false; skipped: string };

/**
 * SMS From: use TWILIO_SMS_FROM if set, else derive digits from WhatsApp from
 * (sandbox SMS may still fail — trial accounts need verified destination numbers).
 */
export async function sendSms(
  toE164: string,
  body: string,
): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromRaw =
    process.env.TWILIO_SMS_FROM?.trim() ||
    process.env.TWILIO_WHATSAPP_FROM?.replace(/^whatsapp:/, "").trim() ||
    "";

  if (!accountSid || !authToken || !fromRaw) {
    console.info("[sms] skipped: Twilio SMS not configured");
    return { sent: false, skipped: "not_configured" };
  }

  const to = toE164.startsWith("+") ? toE164 : `+${toE164.replace(/\D/g, "")}`;
  const from = fromRaw.startsWith("+")
    ? fromRaw
    : `+${fromRaw.replace(/\D/g, "")}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({
    From: from,
    To: to,
    Body: body.slice(0, 1400),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
  } catch (err) {
    console.error("[sms] request failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return { sent: false, skipped: "request_failed" };
  }

  if (!res.ok) {
    console.error("[sms] send failed", {
      provider: "twilio",
      status: res.status,
    });
    return { sent: false, skipped: `twilio_${res.status}` };
  }

  const json = (await res.json().catch(() => ({}))) as { sid?: string };
  return { sent: true, sid: json.sid ?? "unknown" };
}
