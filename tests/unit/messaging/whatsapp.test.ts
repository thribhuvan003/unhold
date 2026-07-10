import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { normalizeIndiaMobile, buildDeadlineWhatsAppBody } from '@/lib/messaging/whatsapp';

describe('normalizeIndiaMobile', () => {
  it('accepts 10-digit Indian mobiles', () => {
    expect(normalizeIndiaMobile('7893238850')).toBe('+917893238850');
    expect(normalizeIndiaMobile('78932 38850')).toBe('+917893238850');
  });

  it('accepts +91 and 91 prefixes', () => {
    expect(normalizeIndiaMobile('+917893238850')).toBe('+917893238850');
    expect(normalizeIndiaMobile('917893238850')).toBe('+917893238850');
  });

  it('rejects invalid shapes', () => {
    expect(normalizeIndiaMobile('12345')).toBeNull();
    expect(normalizeIndiaMobile('0123456789')).toBeNull(); // landline-ish
  });
});

describe('buildDeadlineWhatsAppBody', () => {
  it('includes due date and no-bank promise in English', () => {
    const body = buildDeadlineWhatsAppBody({
      dueAt: '2026-07-15T00:00:00.000Z',
      caseUrl: 'https://example.com/cases/abc',
    });
    expect(body).toMatch(/Unhold reminder/i);
    expect(body).toContain('https://example.com/cases/abc');
    expect(body).toMatch(/never message your bank/i);
  });

  it('supports Hindi locale', () => {
    const body = buildDeadlineWhatsAppBody({
      dueAt: '2026-07-15T00:00:00.000Z',
      locale: 'hi',
    });
    expect(body).toMatch(/रिमाइंडर/);
  });
});

describe('sendWhatsApp env gate', () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it('no-ops when Twilio is not configured', async () => {
    const { sendWhatsApp } = await import('@/lib/messaging/whatsapp');
    const result = await sendWhatsApp({ toE164: '+917893238850', body: 'hi' });
    expect(result.sent).toBe(false);
    if (!result.sent) expect(result.skipped).toBe('not_configured');
  });
});
