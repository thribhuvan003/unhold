import 'server-only';

/**
 * Twilio WhatsApp (sandbox or production sender).
 *
 * Env-gated: missing TWILIO_* → safe no-op (same pattern as Resend email).
 * ONLY messages the USER about their OWN case — never banks, police, or GRM.
 * @see scripts/verify-no-auto-send.sh
 */

export type SendWhatsAppInput = {
  /** E.164 without whatsapp: prefix, e.g. +91789… */
  toE164: string;
  body: string;
};

export type SendWhatsAppResult =
  | { sent: true; sid: string }
  | { sent: false; skipped: string };

const TWILIO_API = 'https://api.twilio.com/2010-04-01/Accounts';

/** Normalize India-first mobile input to E.164 (+91…). Returns null if invalid. */
export function normalizeIndiaMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91') && /^91[6-9]/.test(digits)) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0') && /^0[6-9]/.test(digits)) {
    return `+91${digits.slice(1)}`;
  }
  // Already international non-IN
  if (input.trim().startsWith('+') && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

function toWhatsAppAddress(e164: string): string {
  const n = e164.trim();
  return n.startsWith('whatsapp:') ? n : `whatsapp:${n}`;
}

/**
 * Send a freeform WhatsApp message via Twilio REST.
 * Sandbox: user must have joined the sandbox and recent inbound unlocks freeform (24h window).
 */
export async function sendWhatsApp(input: SendWhatsAppInput): Promise<SendWhatsAppResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim() || 'whatsapp:+14155238886';

  if (!accountSid || !authToken) {
    console.info('[whatsapp] skipped: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN not configured');
    return { sent: false, skipped: 'not_configured' };
  }

  const to = toWhatsAppAddress(input.toE164);
  if (!to.includes('+') || input.body.trim().length === 0) {
    return { sent: false, skipped: 'invalid_input' };
  }

  const url = `${TWILIO_API}/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    From: from.startsWith('whatsapp:') ? from : `whatsapp:${from}`,
    To: to,
    Body: input.body.slice(0, 1500),
  });

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  } catch (err) {
    console.error('[whatsapp] request failed', {
      error: err instanceof Error ? err.message : 'unknown',
    });
    return { sent: false, skipped: 'request_failed' };
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // Never log auth token. Status + short body is enough for ops.
    console.error('[whatsapp] send failed', {
      status: res.status,
      detail: detail.slice(0, 200),
    });
    return { sent: false, skipped: `twilio_${res.status}` };
  }

  const json = (await res.json().catch(() => ({}))) as { sid?: string };
  return { sent: true, sid: json.sid ?? 'unknown' };
}

export function buildDeadlineWhatsAppBody(opts: {
  dueAt: string;
  caseUrl?: string;
  locale?: string;
}): string {
  const dueLabel = new Date(opts.dueAt).toLocaleDateString(
    opts.locale === 'hi' ? 'hi-IN' : 'en-IN',
    { day: 'numeric', month: 'long', year: 'numeric' },
  );
  if (opts.locale === 'hi') {
    return [
      'Unhold रिमाइंडर',
      `आपके फ्रीज़-खाता केस पर एक कदम ${dueLabel} को देय था।`,
      'अपना केस खोलें और अगला कदम पूरा करें।',
      opts.caseUrl ? opts.caseUrl : '',
      '',
      'हम कभी आपके बैंक को मैसेज नहीं करते — सिर्फ़ आपको।',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    'Unhold reminder',
    `A step on your frozen-account case was due on ${dueLabel}.`,
    'Open your case and complete the next action.',
    opts.caseUrl ? opts.caseUrl : '',
    '',
    'We never message your bank — only you. You stay in control.',
  ]
    .filter(Boolean)
    .join('\n');
}
