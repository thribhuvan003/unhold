import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/v1/cases/route';
import { signGuestToken } from '@/lib/auth/guest';
import { resetRateLimitMemory } from '@/lib/ratelimit';
import { errorEnvelopeSchema, caseResponseSchema } from '@/lib/validation/api-schemas';

const guestSessionId = '11111111-1111-4111-8111-111111111111';
const caseId = '22222222-2222-4222-8222-222222222222';
const bankId = '33333333-3333-4333-8333-333333333333';

const insertCaseMock = vi.fn();
const selectCasesMock = vi.fn();
const insertActionMock = vi.fn();
const bankSelectMock = vi.fn();
const insertConsentMock = vi.fn();

function thenable<T>(value: T): Promise<T> {
  return Promise.resolve(value);
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'banks') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: bankSelectMock,
              }),
            }),
          }),
        };
      }
      if (table === 'cases') {
        return {
          insert: () => ({
            select: () => ({
              single: insertCaseMock,
            }),
          }),
          select: () => ({
            order: () => ({
              eq: () => ({
                is: () => thenable(selectCasesMock()),
              }),
            }),
          }),
        };
      }
      if (table === 'action_logs') {
        return { insert: insertActionMock };
      }
      if (table === 'consent_records') {
        return {
          insert: (row: unknown) => {
            insertConsentMock(row);
            return { select: () => ({ single: () => thenable({ data: { id: 'consent-1' }, error: null }) }) };
          },
        };
      }
      return {};
    },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

function guestRequest(url: string, init?: RequestInit) {
  const token = signGuestToken(guestSessionId);
  const headers = new Headers(init?.headers);
  headers.set('X-Guest-Token', token);
  const { signal, ...rest } = init ?? {};
  return new NextRequest(url, { ...rest, headers, signal: signal ?? undefined });
}

describe('cases CRUD contract', () => {
  beforeEach(() => {
    resetRateLimitMemory();
    insertActionMock.mockResolvedValue({ error: null });
    insertConsentMock.mockClear();
    bankSelectMock.mockResolvedValue({ data: { id: bankId }, error: null });
    insertCaseMock.mockResolvedValue({
      data: {
        id: caseId,
        public_id: 'LL-10001',
        status: 'new',
        bank_id: bankId,
        freeze_reason: 'cyber_upi_chain',
        freeze_type: null,
        victim_role: 'innocent_receiver',
        frozen_amount_paise: null,
        intake_json: {},
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      error: null,
    });
    selectCasesMock.mockResolvedValue({
      data: [
        {
          id: caseId,
          public_id: 'LL-10001',
          status: 'new',
          bank_id: bankId,
          freeze_reason: null,
          freeze_type: null,
          victim_role: null,
          frozen_amount_paise: null,
          intake_json: {},
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
  });

  it('POST /cases requires Idempotency-Key', async () => {
    const request = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      body: JSON.stringify({ bank_slug: 'state-bank-of-india' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
  });

  it('POST /cases creates case with guest token', async () => {
    const request = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      },
      body: JSON.stringify({ bank_slug: 'state-bank-of-india', consent_accepted: true }),
    });
    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBe(201);
    expect(caseResponseSchema.safeParse(json).success).toBe(true);
    expect(json.public_id).toMatch(/^LL-\d+$/);
    expect(insertConsentMock).toHaveBeenCalledTimes(1);
    expect(insertConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({ consent_type: 'case_data_processing' }),
    );
  });

  it('POST /cases also records cross_border_ai and ai_ocr_processing when ai_consent_accepted is true', async () => {
    const request = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      },
      body: JSON.stringify({
        bank_slug: 'state-bank-of-india',
        consent_accepted: true,
        ai_consent_accepted: true,
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(201);
    expect(insertConsentMock).toHaveBeenCalledTimes(3);
    const consentTypes = insertConsentMock.mock.calls.map(
      (call) => (call[0] as { consent_type: string }).consent_type,
    );
    expect(consentTypes).toEqual(['case_data_processing', 'cross_border_ai', 'ai_ocr_processing']);
  });

  it('POST /cases rejects missing consent_accepted', async () => {
    insertCaseMock.mockClear();
    const request = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      },
      body: JSON.stringify({ bank_slug: 'state-bank-of-india' }),
    });
    const response = await POST(request);
    const json = await response.json();
    expect(response.status).toBe(400);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(insertCaseMock).not.toHaveBeenCalled();
  });

  it('GET /cases lists guest-owned cases', async () => {
    const request = guestRequest('http://localhost/api/v1/cases');
    const response = await GET(request);
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.cases).toHaveLength(1);
  });

  it('replays idempotent POST response', async () => {
    const key = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const req1 = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ bank_slug: 'state-bank-of-india', consent_accepted: true }),
    });
    await POST(req1);
    insertCaseMock.mockClear();

    const req2 = guestRequest('http://localhost/api/v1/cases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ bank_slug: 'state-bank-of-india' }),
    });
    const response = await POST(req2);
    expect(response.status).toBe(201);
    expect(insertCaseMock).not.toHaveBeenCalled();
  });
});