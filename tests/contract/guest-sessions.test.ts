import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/guest/sessions/route';
import { verifyGuestToken, GUEST_COOKIE_NAME } from '@/lib/auth/guest';
import { errorEnvelopeSchema, guestSessionResponseSchema } from '@/lib/validation/api-schemas';

const insertMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: insertMock,
    }),
  }),
}));

describe('POST /api/v1/guest/sessions', () => {
  beforeEach(() => {
    insertMock.mockReset();
    insertMock.mockResolvedValue({ error: null });
  });

  it('returns device_token JWT and guest_session_id', async () => {
    const request = new NextRequest('http://localhost/api/v1/guest/sessions', { method: 'POST' });
    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(guestSessionResponseSchema.safeParse(json).success).toBe(true);
    expect(verifyGuestToken(json.device_token)?.sub).toBe(json.guest_session_id);
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });

  it('sets ll_guest httpOnly SameSite=Lax cookie', async () => {
    const request = new NextRequest('http://localhost/api/v1/guest/sessions', { method: 'POST' });
    const response = await POST(request);
    const cookie = response.cookies.get(GUEST_COOKIE_NAME);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
  });

  it('stores hashed token in guest_sessions', async () => {
    const request = new NextRequest('http://localhost/api/v1/guest/sessions', { method: 'POST' });
    await POST(request);
    expect(insertMock).toHaveBeenCalledTimes(1);
    const payload = insertMock.mock.calls[0][0];
    expect(payload.device_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(payload.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('returns error envelope shape on failure', async () => {
    insertMock.mockResolvedValue({ error: { message: 'db down' } });
    const request = new NextRequest('http://localhost/api/v1/guest/sessions', { method: 'POST' });
    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.error.request_id).toBeTruthy();
  });
});