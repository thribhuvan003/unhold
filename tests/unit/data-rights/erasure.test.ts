import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ admin: null as unknown }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => state.admin,
}));

import {
  ERASURE_CAPABILITY_GRACE_MS,
  processCaseErasure,
} from '@/lib/data-rights/erasure';

const CASE_ID = '22222222-2222-4222-8222-222222222222';

function createAdmin(scheduledAt: string) {
  const events: string[] = [];
  const listedBuckets: string[] = [];
  const updateChain = {
    eq: () => updateChain,
    in: () => Promise.resolve({ error: null }),
    lt: () => Promise.resolve({ error: null }),
  };

  const admin = {
    from: (table: string) => {
      if (table === 'cases') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: {
                    id: CASE_ID,
                    guest_session_id: null,
                    erasure_requested_at: '2026-07-13T00:00:00.000Z',
                    erasure_scheduled_at: scheduledAt,
                  },
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'agent_jobs') {
        return {
          update: () => updateChain,
          select: () => ({
            eq: () => ({
              eq: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'evidence') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ storage_bucket: 'evidence', storage_path: `${CASE_ID}/ev-1/file.pdf` }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'audit_seals') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: [{ sealed_content_bucket: 'bundles', sealed_content_path: `${CASE_ID}/bundle.pdf` }],
                error: null,
              }),
          }),
        };
      }
      return {};
    },
    storage: {
      from: (bucket: string) => ({
        list: async () => {
          listedBuckets.push(bucket);
          return bucket === 'audit-seals'
            ? { data: null, error: { message: 'Bucket not found' } }
            : { data: [], error: null };
        },
        remove: async (paths: string[]) => {
          events.push(`storage:${bucket}:${paths.join(',')}`);
          return { error: null };
        },
      }),
    },
    rpc: async () => {
      events.push('rpc:purge');
      return { data: true, error: null };
    },
  };

  return { admin, events, listedBuckets };
}

describe('case erasure worker', () => {
  beforeEach(() => vi.clearAllMocks());

  it('waits beyond the two-hour signed-upload lifetime before touching storage', async () => {
    expect(ERASURE_CAPABILITY_GRACE_MS).toBeGreaterThan(2 * 60 * 60 * 1000);
    const fixture = createAdmin(new Date(Date.now() + 60_000).toISOString());
    state.admin = fixture.admin;

    expect(await processCaseErasure(CASE_ID)).toBe('scheduled');
    expect(fixture.events).toEqual([]);
  });

  it('removes evidence and bundle objects before the database purge', async () => {
    const fixture = createAdmin(new Date(Date.now() - 60_000).toISOString());
    state.admin = fixture.admin;

    expect(await processCaseErasure(CASE_ID)).toBe('deleted');
    expect(fixture.events).toEqual([
      `storage:evidence:${CASE_ID}/ev-1/file.pdf`,
      `storage:bundles:${CASE_ID}/bundle.pdf`,
      'rpc:purge',
    ]);
    expect(fixture.listedBuckets).toEqual(['evidence', 'bundles']);
  });
});
