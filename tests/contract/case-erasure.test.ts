import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireOwner: vi.fn(),
  processErasure: vi.fn(),
  updatePayload: vi.fn(),
  insertAction: vi.fn(),
  updateJobs: vi.fn(),
}));

vi.mock('@/lib/api/case-access', () => ({
  requireDirectCaseOwner: mocks.requireOwner,
}));

vi.mock('@/lib/consent/record', () => ({ recordConsent: vi.fn() }));

vi.mock('@/lib/data-rights/erasure', () => ({
  ERASURE_CAPABILITY_GRACE_MS: 2 * 60 * 60 * 1000,
  processCaseErasure: mocks.processErasure,
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          update: (payload: unknown) => {
            mocks.updatePayload(payload);
            const chain = {
              eq: () => chain,
              is: () => chain,
              select: () => chain,
              maybeSingle: () => Promise.resolve({ data: { id: CASE_ID }, error: null }),
            };
            return chain;
          },
        };
      }
      if (table === 'agent_jobs') {
        return {
          update: (payload: unknown) => {
            mocks.updateJobs(payload);
            const chain = { eq: () => chain, in: () => Promise.resolve({ error: null }) };
            return chain;
          },
        };
      }
      if (table === 'action_logs') {
        return { insert: mocks.insertAction };
      }
      return {};
    },
  }),
}));

import { POST } from '@/app/api/v1/cases/[id]/erasure/route';

const CASE_ID = '22222222-2222-4222-8222-222222222222';
const PUBLIC_ID = 'LL-12345';

function request(confirmCaseId: string) {
  return new NextRequest(`http://localhost/api/v1/cases/${CASE_ID}/erasure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm_case_id: confirmCaseId }),
  });
}

const context = { params: Promise.resolve({ id: CASE_ID }) };

describe('case erasure contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOwner.mockResolvedValue({
      auth: {
        userId: 'user-1',
        guestSessionId: null,
        actorType: 'user',
        actorId: 'user-1',
      },
      caseRow: {
        id: CASE_ID,
        public_id: PUBLIC_ID,
        user_id: 'user-1',
        guest_session_id: null,
        intake_json: { reminder_email: 'private@example.com', reminder_opt_in: false },
        erasure_requested_at: null,
        erasure_completed_at: null,
      },
    });
    mocks.processErasure.mockResolvedValue('scheduled');
    mocks.insertAction.mockResolvedValue({ error: null });
  });

  it('requires the exact public case ID before changing state', async () => {
    const response = await POST(request('LL-WRONG'), context);
    expect(response.status).toBe(400);
    expect(mocks.updatePayload).not.toHaveBeenCalled();
    expect(mocks.processErasure).not.toHaveBeenCalled();
  });

  it('blocks the case immediately and schedules purge after upload capabilities expire', async () => {
    const before = Date.now();
    const response = await POST(request(PUBLIC_ID), context);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'scheduled' });

    const update = mocks.updatePayload.mock.calls[0]![0] as Record<string, unknown>;
    expect(update).toMatchObject({
      swarm_paused: true,
      next_check_at: null,
      user_action_required: false,
    });
    expect(new Date(String(update.erasure_scheduled_at)).getTime()).toBeGreaterThanOrEqual(
      before + 2 * 60 * 60 * 1000,
    );
    expect(JSON.stringify(update.intake_json)).not.toContain('private@example.com');
    expect(mocks.updateJobs).toHaveBeenCalled();
    expect(mocks.processErasure).toHaveBeenCalledWith(CASE_ID);
  });

  it('still returns accepted when audit logging is unavailable', async () => {
    mocks.insertAction.mockRejectedValueOnce(new Error('audit unavailable'));
    const response = await POST(request(PUBLIC_ID), context);
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ status: 'scheduled' });
  });
});
