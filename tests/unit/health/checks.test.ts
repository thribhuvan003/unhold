import { describe, expect, it } from 'vitest';
import { collectHealthChecks } from '@/lib/health/checks';

const FULL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  GUEST_JWT_SECRET: 'a'.repeat(32),
  CRON_SECRET: 'cron',
  NVIDIA_API_KEYS: 'nvapi-1,nvapi-2',
};

describe('collectHealthChecks', () => {
  it('reports ok=true and ai_ready=true when all required + NVIDIA are set', () => {
    const report = collectHealthChecks(FULL_ENV);
    expect(report.ok).toBe(true);
    expect(report.ai_ready).toBe(true);
  });

  it('reports ok=false when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    const report = collectHealthChecks({ ...FULL_ENV, SUPABASE_SERVICE_ROLE_KEY: '' });
    expect(report.ok).toBe(false);
    const check = report.checks.find((c) => c.key === 'SUPABASE_SERVICE_ROLE_KEY');
    expect(check?.configured).toBe(false);
    expect(check?.severity).toBe('required');
  });

  it('treats a too-short GUEST_JWT_SECRET as not configured (mirrors lib/auth/guest.ts)', () => {
    const report = collectHealthChecks({ ...FULL_ENV, GUEST_JWT_SECRET: 'short' });
    expect(report.ok).toBe(false);
    expect(report.checks.find((c) => c.key === 'GUEST_JWT_SECRET')?.configured).toBe(false);
  });

  it('missing both Groq and NVIDIA keeps ok=true (required) but ai_ready=false (degrades, not errors)', () => {
    const report = collectHealthChecks({ ...FULL_ENV, NVIDIA_API_KEYS: '', GROQ_API_KEYS: '' });
    expect(report.ok).toBe(true);
    expect(report.ai_ready).toBe(false);
  });

  it('Groq alone makes ai_ready=true (Groq is the primary generation provider)', () => {
    const report = collectHealthChecks({ ...FULL_ENV, NVIDIA_API_KEYS: '', GROQ_API_KEYS: 'gsk-1,gsk-2' });
    expect(report.ai_ready).toBe(true);
    expect(report.checks.find((c) => c.key === 'GROQ_API_KEYS')?.configured).toBe(true);
  });

  it('accepts single-key NVIDIA fallbacks', () => {
    const report = collectHealthChecks({ ...FULL_ENV, NVIDIA_API_KEYS: '', NVIDIA_API_KEY: 'nvapi-x' });
    expect(report.ai_ready).toBe(true);
  });

  it('marks Upstash optional — absent does not affect ok', () => {
    const report = collectHealthChecks(FULL_ENV);
    const upstash = report.checks.find((c) => c.key === 'UPSTASH_REDIS_REST_URL');
    expect(upstash?.severity).toBe('optional');
    expect(report.ok).toBe(true);
  });

  it('marks Twilio and Resend optional messaging — absent does not affect ok', () => {
    const report = collectHealthChecks(FULL_ENV);
    expect(report.checks.find((c) => c.key === 'TWILIO')?.severity).toBe('optional');
    expect(report.checks.find((c) => c.key === 'RESEND')?.severity).toBe('optional');
    expect(report.checks.find((c) => c.key === 'TWILIO')?.configured).toBe(false);
    expect(report.ok).toBe(true);

    const withMsg = collectHealthChecks({
      ...FULL_ENV,
      TWILIO_ACCOUNT_SID: 'ACxx',
      TWILIO_AUTH_TOKEN: 'tok',
      TWILIO_SMS_FROM: '+1000',
      RESEND_API_KEY: 're_x',
      RESEND_FROM_EMAIL: 'Unhold <noreply@unhold.live>',
    });
    expect(withMsg.checks.find((c) => c.key === 'TWILIO')?.configured).toBe(true);
    expect(withMsg.checks.find((c) => c.key === 'RESEND')?.configured).toBe(true);
  });

  it('never leaks secret values — only booleans and static hints', () => {
    const report = collectHealthChecks(FULL_ENV);
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('service');
    expect(serialized).not.toContain('nvapi-1');
    expect(serialized).not.toContain('a'.repeat(32));
  });
});
