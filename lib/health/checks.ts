/**
 * Configuration health checks.
 *
 * Every config failure in the app otherwise collapses into a single opaque 500
 * ("An unexpected error occurred" — lib/api/response.ts), because the real cause
 * (e.g. createAdminClient throwing on a missing service-role key) is only logged
 * server-side. This module reports WHICH dependencies are configured so a tester
 * can tell "Supabase not set" from "NVIDIA key missing" without reading logs.
 *
 * Security: returns booleans + static hints ONLY. It never reads or echoes a
 * secret value.
 */

export type HealthSeverity = 'required' | 'ai' | 'optional';

export interface HealthCheck {
  key: string;
  configured: boolean;
  severity: HealthSeverity;
  hint: string;
}

export interface HealthReport {
  /** True when every `required` dependency is configured. */
  ok: boolean;
  /** True when generation is configured (Groq primary, or NVIDIA fallback). */
  ai_ready: boolean;
  checks: HealthCheck[];
}

type EnvLike = Record<string, string | undefined>;

function isSet(value: string | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function collectHealthChecks(env: EnvLike = process.env): HealthReport {
  const groqConfigured = isSet(env.GROQ_API_KEYS) || isSet(env.GROQ_API_KEY);
  const nvidiaConfigured =
    isSet(env.NVIDIA_API_KEYS) || isSet(env.NVIDIA_API_KEY) || isSet(env.NVIDIA_NIM_API_KEY);

  // Mirror lib/auth/guest.ts: secret must exist AND be at least 32 chars.
  const guestSecretOk = isSet(env.GUEST_JWT_SECRET) && env.GUEST_JWT_SECRET!.length >= 32;

  const checks: HealthCheck[] = [
    {
      key: 'NEXT_PUBLIC_SUPABASE_URL',
      configured: isSet(env.NEXT_PUBLIC_SUPABASE_URL),
      severity: 'required',
      hint: 'Supabase project URL (Settings → API).',
    },
    {
      key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      configured: isSet(env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      severity: 'required',
      hint: 'Supabase anon/public key for the browser client.',
    },
    {
      key: 'SUPABASE_SERVICE_ROLE_KEY',
      configured: isSet(env.SUPABASE_SERVICE_ROLE_KEY),
      severity: 'required',
      hint: 'Admin key; missing this is the usual cause of the generic 500.',
    },
    {
      key: 'GUEST_JWT_SECRET',
      configured: guestSecretOk,
      severity: 'required',
      hint: 'Guest session signing secret; must be at least 32 characters.',
    },
    {
      key: 'CRON_SECRET',
      configured: isSet(env.CRON_SECRET),
      severity: 'required',
      hint: 'Bearer secret for internal cron / job-processor routes.',
    },
    {
      key: 'GROQ_API_KEYS',
      configured: groqConfigured,
      severity: 'ai',
      hint: 'Groq key(s) — PRIMARY for all generation (analyzer, drafter). Absent → falls back to NVIDIA.',
    },
    {
      key: 'NVIDIA_API_KEYS',
      configured: nvidiaConfigured,
      severity: 'ai',
      hint: 'NVIDIA key(s) — embeddings (RAG) + chat fallback. Absent → RAG grounding degrades.',
    },
    {
      key: 'UPSTASH_REDIS_REST_URL',
      configured: isSet(env.UPSTASH_REDIS_REST_URL) && isSet(env.UPSTASH_REDIS_REST_TOKEN),
      severity: 'optional',
      hint: 'Distributed rate-limit/idempotency. Absent → in-memory fallback.',
    },
    {
      key: 'TWILIO',
      configured:
        isSet(env.TWILIO_ACCOUNT_SID) &&
        isSet(env.TWILIO_AUTH_TOKEN) &&
        (isSet(env.TWILIO_SMS_FROM) || isSet(env.TWILIO_WHATSAPP_FROM)),
      severity: 'optional',
      hint: 'SMS/WhatsApp (trial sandbox ok). Absent → recovery SMS and WA test disabled.',
    },
    {
      key: 'RESEND',
      configured: isSet(env.RESEND_API_KEY) && isSet(env.RESEND_FROM_EMAIL),
      severity: 'optional',
      hint: 'Transactional email. Absent → email features degrade; user still can copy/print.',
    },
  ];

  const ok = checks.filter((c) => c.severity === 'required').every((c) => c.configured);

  return { ok, ai_ready: groqConfigured || nvidiaConfigured, checks };
}
