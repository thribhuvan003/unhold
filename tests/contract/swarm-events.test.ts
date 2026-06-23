import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/v1/cases/[id]/swarm-events/route';
import { signGuestToken } from '@/lib/auth/guest';
import { resetRateLimitMemory } from '@/lib/ratelimit';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';

const caseId = '22222222-2222-4222-8222-222222222222';
const userId = '55555555-5555-4555-8555-555555555555';
const guestSessionId = '11111111-1111-4111-8111-111111111111';

const userIdRef: { current: string | null } = { current: null };
const caseRowRef: {
  current: { id: string; user_id: string | null; guest_session_id: string | null } | null;
} = { current: null };

const eventsSelectMock = vi.fn();
const limitArgMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: userIdRef.current ? { id: userIdRef.current } : null } }),
    },
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: caseRowRef.current, error: null }),
            }),
          }),
        };
      }
      if (table === 'permissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }),
              }),
            }),
          }),
        };
      }
      if (table === 'swarm_events') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: (n: number) => {
                  limitArgMock(n);
                  return Promise.resolve(eventsSelectMock());
                },
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

function getRequest(query?: string, headers?: Record<string, string>) {
  const suffix = query ? `?${query}` : '';
  return new NextRequest(`http://localhost/api/v1/cases/${caseId}/swarm-events${suffix}`, { headers });
}

function guestHeaders() {
  return { 'X-Guest-Token': signGuestToken(guestSessionId) };
}

describe('GET /cases/:id/swarm-events', () => {
  beforeEach(() => {
    userIdRef.current = null;
    caseRowRef.current = null;
    eventsSelectMock.mockReset().mockReturnValue({ data: [], error: null });
    limitArgMock.mockReset();
    resetRateLimitMemory();
  });

  it('returns 401 with no auth at all', async () => {
    const request = getRequest();
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();
    expect(response.status).toBe(401);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it('returns 403 when the authenticated user does not own the case', async () => {
    userIdRef.current = userId;
    caseRowRef.current = { id: caseId, user_id: 'someone-else', guest_session_id: null };
    const request = getRequest();
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(403);
  });

  it('returns 404 for an unknown case', async () => {
    userIdRef.current = userId;
    caseRowRef.current = null;
    const request = getRequest();
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(404);
  });

  it('falls back to the default limit for a non-integer limit instead of erroring', async () => {
    caseRowRef.current = { id: caseId, user_id: null, guest_session_id: guestSessionId };
    const request = getRequest('limit=3.7', guestHeaders());
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(200);
    expect(limitArgMock).toHaveBeenCalledWith(20);
  });

  it('returns 429 once a case is polled past the read rate limit (SEC-1)', async () => {
    caseRowRef.current = { id: caseId, user_id: null, guest_session_id: guestSessionId };
    const headers = guestHeaders();

    let lastResponse: Response | null = null;
    for (let i = 0; i < 61; i += 1) {
      lastResponse = await GET(getRequest(undefined, headers), { params: Promise.resolve({ id: caseId }) });
    }

    expect(lastResponse?.status).toBe(429);
    const json = await lastResponse?.json();
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it('allows a guest viewer of their own case (viewer level, not owner-only)', async () => {
    caseRowRef.current = { id: caseId, user_id: null, guest_session_id: guestSessionId };
    eventsSelectMock.mockReturnValue({
      data: [
        {
          id: 'event-1',
          agent_role: 'VERIFIER',
          event_type: 'evidence.verified',
          severity: 'info',
          message: 'Evidence verified',
          metadata_json: { evidence_id: 'ev-1', confidence: 0.9 },
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });

    const request = getRequest(undefined, guestHeaders());
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.events).toHaveLength(1);
    expect(json.events[0].metadata_json.evidence_id).toBe('ev-1');
  });

  it('returns 403 for a guest token that does not match the case', async () => {
    caseRowRef.current = { id: caseId, user_id: null, guest_session_id: 'someone-else-session' };
    const request = getRequest(undefined, guestHeaders());
    const response = await GET(request, { params: Promise.resolve({ id: caseId }) });
    expect(response.status).toBe(403);
  });
});
