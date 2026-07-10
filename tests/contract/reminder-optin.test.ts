import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/cases/[id]/reminder-optin/route';

const caseId = '22222222-2222-4222-8222-222222222222';
const userId = '44444444-4444-4444-8444-444444444444';

const caseAccessMock = vi.fn();
const intakeSelectMock = vi.fn();
const insertConsentMock = vi.fn();
const insertActionMock = vi.fn();
const updateCaseMock = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve(caseAccessMock()),
              single: () => Promise.resolve(intakeSelectMock()),
            }),
          }),
          update: (payload: unknown) => {
            updateCaseMock(payload);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'consent_records') {
        return {
          insert: (row: unknown) => {
            insertConsentMock(row);
            return {
              select: () => ({ single: () => Promise.resolve({ data: { id: 'consent-1' }, error: null }) }),
            };
          },
        };
      }
      if (table === 'action_logs') {
        return { insert: (row: unknown) => Promise.resolve(insertActionMock(row) ?? { error: null }) };
      }
      if (table === 'permissions') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ is: () => ({ maybeSingle: () => Promise.resolve({ data: null }) }) }) }),
          }),
        };
      }
      return {};
    },
  }),
}));

// Authenticated user (owner). Owner-only route rejects guests, so we test as an
// authenticated case owner.
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: { id: userId } } }) },
  }),
}));

function ctx() {
  return { params: Promise.resolve({ id: caseId }) };
}

function jsonRequest(body: unknown) {
  return new NextRequest('http://localhost/api/v1/cases/' + caseId + '/reminder-optin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('reminder-optin contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertActionMock.mockReturnValue({ error: null });
    caseAccessMock.mockResolvedValue({
      data: { id: caseId, user_id: userId, guest_session_id: null },
      error: null,
    });
    intakeSelectMock.mockResolvedValue({ data: { intake_json: {} }, error: null });
  });

  it('records an email_reminders consent grant for the case owner', async () => {
    const response = await POST(jsonRequest({ email: 'me@example.com', opt_in: true }), ctx());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({
      opt_in: true,
      email: 'me@example.com',
      whatsapp_opt_in: false,
      whatsapp: null,
    });
    // Email + WhatsApp consent rows (WA granted=false when off).
    expect(insertConsentMock).toHaveBeenCalledTimes(2);
    expect(insertConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({ consent_type: 'email_reminders', granted: true, case_id: caseId }),
    );
    // Reminder email is stored on intake_json.
    expect(updateCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        intake_json: expect.objectContaining({ reminder_email: 'me@example.com', reminder_opt_in: true }),
      }),
    );
  });

  it('records a withdrawal (granted=false) when opting out', async () => {
    const response = await POST(jsonRequest({ email: 'me@example.com', opt_in: false }), ctx());
    expect(response.status).toBe(200);
    expect(insertConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({ consent_type: 'email_reminders', granted: false }),
    );
  });

  it('records WhatsApp opt-in with normalized +91 number', async () => {
    const response = await POST(
      jsonRequest({
        email: '',
        opt_in: false,
        whatsapp: '7893238850',
        whatsapp_opt_in: true,
      }),
      ctx(),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.whatsapp_opt_in).toBe(true);
    expect(json.whatsapp).toBe('+917893238850');
    expect(insertConsentMock).toHaveBeenCalledWith(
      expect.objectContaining({ consent_type: 'whatsapp_sms_reminders', granted: true }),
    );
    expect(updateCaseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        intake_json: expect.objectContaining({
          reminder_whatsapp_e164: '+917893238850',
          reminder_whatsapp_opt_in: true,
        }),
      }),
    );
  });


  it('returns 404 when the case does not exist', async () => {
    caseAccessMock.mockResolvedValue({ data: null, error: null });
    const response = await POST(jsonRequest({ email: 'me@example.com', opt_in: true }), ctx());
    expect(response.status).toBe(404);
    expect(insertConsentMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid email', async () => {
    const response = await POST(jsonRequest({ email: 'not-an-email', opt_in: true }), ctx());
    expect(response.status).toBe(400);
    expect(insertConsentMock).not.toHaveBeenCalled();
  });
});
