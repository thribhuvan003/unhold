import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as postUserAction } from '@/app/api/v1/cases/[id]/user-actions/route';
import { POST as postEscalation } from '@/app/api/v1/cases/[id]/escalations/route';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';

const caseId = '22222222-2222-4222-8222-222222222222';
const ownerId = '55555555-5555-4555-8555-555555555555';
const otherUserId = '66666666-6666-4666-8666-666666666666';

const userIdRef: { current: string | null } = { current: null };
const caseRowRef: { current: { id: string; user_id: string | null; guest_session_id: string | null } | null } = {
  current: null,
};

const actionInsertMock = vi.fn();
const actionUpdateMock = vi.fn();
const caseUpdateMock = vi.fn();
const enqueueAgentJobMock = vi.fn();
const escalationUpsertMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: userIdRef.current ? { id: userIdRef.current } : null },
      }),
    },
  }),
}));

vi.mock('@/lib/jobs/enqueue', () => ({
  enqueueAgentJob: (...args: unknown[]) => enqueueAgentJobMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: caseRowRef.current, error: null }),
              single: () => Promise.resolve({ data: caseRowRef.current, error: null }),
            }),
          }),
          update: (row: unknown) => {
            caseUpdateMock(row);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      }
      if (table === 'permissions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  maybeSingle: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === 'user_actions') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                is: () => ({
                  is: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
          insert: (row: unknown) => {
            actionInsertMock(row);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'ua-1' }, error: null }),
              }),
            };
          },
          update: (row: unknown) => {
            actionUpdateMock(row);
            return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
          },
        };
      }
      if (table === 'escalations') {
        return {
          upsert: (row: unknown) => {
            escalationUpsertMock(row);
            return Promise.resolve({ error: null });
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  }),
}));

function request(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('workflow route access guards', () => {
  beforeEach(() => {
    userIdRef.current = null;
    caseRowRef.current = { id: caseId, user_id: ownerId, guest_session_id: null };
    actionInsertMock.mockClear();
    actionUpdateMock.mockClear();
    caseUpdateMock.mockClear();
    escalationUpsertMock.mockClear();
    enqueueAgentJobMock.mockReset().mockResolvedValue({ enqueued: true, job_id: 'job-1' });
  });

  it('blocks unauthenticated user-action creation before side effects', async () => {
    const response = await postUserAction(
      request(`/api/v1/cases/${caseId}/user-actions`, {
        action_type: 'upload_evidence',
        title: 'Upload bank freeze SMS',
      }),
      { params: Promise.resolve({ id: caseId }) },
    );

    expect(response.status).toBe(401);
    expect(errorEnvelopeSchema.safeParse(await response.json()).success).toBe(true);
    expect(actionInsertMock).not.toHaveBeenCalled();
  });

  it('blocks non-owner user-action creation before side effects', async () => {
    userIdRef.current = otherUserId;

    const response = await postUserAction(
      request(`/api/v1/cases/${caseId}/user-actions`, {
        action_type: 'upload_evidence',
        title: 'Upload bank freeze SMS',
      }),
      { params: Promise.resolve({ id: caseId }) },
    );

    expect(response.status).toBe(403);
    expect(actionInsertMock).not.toHaveBeenCalled();
  });

  it('allows the case owner to create a user action', async () => {
    userIdRef.current = ownerId;

    const response = await postUserAction(
      request(`/api/v1/cases/${caseId}/user-actions`, {
        action_type: 'upload_evidence',
        title: 'Upload bank freeze SMS',
      }),
      { params: Promise.resolve({ id: caseId }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'ua-1' });
    expect(actionInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ case_id: caseId, action_type: 'upload_evidence' }),
    );
  });

  it('allows the case owner to enqueue a copy-only letter draft', async () => {
    userIdRef.current = ownerId;

    const response = await postEscalation(
      request(`/api/v1/cases/${caseId}/escalations`, { level: 'L1' }),
      { params: Promise.resolve({ id: caseId }) },
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ enqueued: true, job_id: 'job-1' });
    expect(enqueueAgentJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: caseId,
        job_type: 'draft_letter',
        agent_role: 'DRAFTER',
        payload: { case_id: caseId, level: 'L1' },
      }),
    );
    expect(escalationUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        case_id: caseId,
        level: 'L1',
        status: 'draft',
        metadata_json: expect.objectContaining({ queued: true, job_id: 'job-1' }),
      }),
    );
  });
});
