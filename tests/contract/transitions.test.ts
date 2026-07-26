import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/cases/[id]/transitions/route';
import { hashDeviceToken, signGuestToken } from '@/lib/auth/guest';
import { resetRateLimitMemory } from '@/lib/ratelimit';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';

const caseId = '22222222-2222-4222-8222-222222222222';
const userId = '55555555-5555-4555-8555-555555555555';
const guestSessionId = '11111111-1111-4111-8111-111111111111';
const guestToken = signGuestToken(guestSessionId);

const applyTransitionMock = vi.fn();
const caseAccessMock = vi.fn();

vi.mock('@/lib/state-machine/transitions', () => ({
  applyTransition: (...args: unknown[]) => applyTransitionMock(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: userId } } }),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'guest_sessions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: guestSessionId,
                  device_token_hash: hashDeviceToken(guestToken),
                  expires_at: '2099-01-01T00:00:00.000Z',
                  claimed_by: null,
                  revoked_at: null,
                },
                error: null,
              }),
            }),
          }),
          update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: caseAccessMock,
          }),
        }),
      };
    },
  }),
}));

function authedRequest(
  url: string,
  options?: { method?: string; headers?: Record<string, string>; body?: string },
) {
  return new NextRequest(url, {
    method: options?.method,
    headers: options?.headers,
    body: options?.body,
  });
}

describe('POST /cases/:id/transitions', () => {
  beforeEach(() => {
    resetRateLimitMemory();
    caseAccessMock.mockResolvedValue({
      data: { id: caseId, user_id: userId, guest_session_id: null },
      error: null,
    });
    applyTransitionMock.mockResolvedValue({
      id: caseId,
      public_id: 'LL-10001',
      status: 'intake_scoping',
      bank_id: null,
      freeze_reason: null,
      freeze_type: null,
      victim_role: null,
      frozen_amount_paise: null,
      intake_json: {},
      created_at: '2026-01-01T00:00:00.000Z',
      updated_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('requires Idempotency-Key', async () => {
    const request = authedRequest(`http://localhost/api/v1/cases/${caseId}/transitions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'evidence.submitted' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it('applies transition via state machine only', async () => {
    const request = authedRequest(`http://localhost/api/v1/cases/${caseId}/transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      },
      body: JSON.stringify({ event: 'evidence.submitted' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(applyTransitionMock).toHaveBeenCalledWith(
      expect.objectContaining({ caseId, event: 'evidence.submitted', actorType: 'user' }),
    );
    expect(json.case.status).toBe('intake_scoping');
  });

  it('returns guard_failed envelope on invalid transition', async () => {
    const { ApiError } = await import('@/lib/api/errors');
    applyTransitionMock.mockRejectedValue(
      new ApiError(422, 'guard_failed', 'At least one verified evidence required', {
        guard: 'has_min_evidence',
      }),
    );

    const request = authedRequest(`http://localhost/api/v1/cases/${caseId}/transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      },
      body: JSON.stringify({ event: 'evidence.submitted' }),
    });
    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(422);
    expect(json.error.code).toBe('guard_failed');
    expect(json.error.guard).toBe('has_min_evidence');
    expect(json.error.request_id).toBeTruthy();
  });

  it('rejects guest without owner access', async () => {
    caseAccessMock.mockResolvedValue({
      data: { id: caseId, user_id: null, guest_session_id: '11111111-1111-4111-8111-111111111111' },
      error: null,
    });

    const request = new NextRequest(`http://localhost/api/v1/cases/${caseId}/transitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        Cookie: `ll_guest=${guestToken}`,
      },
      body: JSON.stringify({ event: 'evidence.submitted' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(403);
  });
});
