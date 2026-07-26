import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/v1/internal/cron/rankings/route';
import { errorEnvelopeSchema } from '@/lib/validation/api-schemas';

const authorizeCronJobMock = vi.fn();
const banksSelectMock = vi.fn();
const refreshSnapshotRpcMock = vi.fn();
const refreshLeaderboardRpcMock = vi.fn();

vi.mock('@/lib/api/cron-auth', () => ({
  authorizeCronJob: (...args: unknown[]) => authorizeCronJobMock(...args),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => banksSelectMock(),
      }),
    }),
    rpc: (fn: string, args: unknown) => {
      if (fn === 'refresh_bank_score_snapshot') return refreshSnapshotRpcMock(args);
      if (fn === 'refresh_leaderboard_mv') return refreshLeaderboardRpcMock();
      throw new Error(`unexpected rpc: ${fn}`);
    },
  }),
}));

function cronRequest() {
  return new NextRequest('http://localhost/api/v1/internal/cron/rankings', { method: 'POST' });
}

describe('POST /internal/cron/rankings', () => {
  beforeEach(() => {
    authorizeCronJobMock.mockReset();
    banksSelectMock.mockReset();
    refreshSnapshotRpcMock.mockReset();
    refreshLeaderboardRpcMock.mockReset();
  });

  it('returns skipped:true when the cron lock is already held', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: false });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.skipped).toBe(true);
    expect(json.reason).toBe('concurrent_cron');
    expect(banksSelectMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the active-banks query itself fails', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({ data: null, error: { message: 'connection refused' } });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe('internal_error');
    expect(json.error.message).toContain('connection refused');
    expect(refreshSnapshotRpcMock).not.toHaveBeenCalled();
  });

  it('returns 500 when every bank fails to refresh, without refreshing the leaderboard', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({
      data: [{ id: 'bank-1' }, { id: 'bank-2' }],
      error: null,
    });
    refreshSnapshotRpcMock.mockResolvedValue({ error: { message: 'db timeout' } });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(500);
    expect(json.error.code).toBe('internal_error');
    expect(refreshLeaderboardRpcMock).not.toHaveBeenCalled();
  });

  it('uses a day bucket and 1-hour lock TTL, not the 15-min default', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({ data: [], error: null });
    refreshLeaderboardRpcMock.mockResolvedValue({ error: null });

    await POST(cronRequest());

    expect(authorizeCronJobMock).toHaveBeenCalledWith(
      expect.anything(),
      'rankings',
      expect.objectContaining({ lockTtlSeconds: 3600 }),
    );
  });

  it('refreshes every active bank then the leaderboard view on the happy path', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({
      data: [{ id: 'bank-1' }, { id: 'bank-2' }],
    });
    refreshSnapshotRpcMock.mockResolvedValue({ error: null });
    refreshLeaderboardRpcMock.mockResolvedValue({ error: null });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(refreshSnapshotRpcMock).toHaveBeenCalledTimes(2);
    expect(refreshSnapshotRpcMock).toHaveBeenCalledWith({ p_bank_id: 'bank-1' });
    expect(json.refreshed).toBe(2);
    expect(json.bank_errors).toEqual([]);
    expect(json.leaderboard_refreshed).toBe(true);
  });

  it('reports per-bank failures without failing the whole batch', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({
      data: [{ id: 'bank-1' }, { id: 'bank-2' }],
    });
    refreshSnapshotRpcMock
      .mockResolvedValueOnce({ error: { message: 'db timeout' } })
      .mockResolvedValueOnce({ error: null });
    refreshLeaderboardRpcMock.mockResolvedValue({ error: null });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.refreshed).toBe(1);
    expect(json.bank_errors).toEqual([{ bank_id: 'bank-1', message: 'db timeout' }]);
    expect(json.leaderboard_refreshed).toBe(true);
  });

  it('reports a leaderboard refresh error without throwing', async () => {
    authorizeCronJobMock.mockResolvedValue({ bucket: '2026-06-21', lockAcquired: true });
    banksSelectMock.mockResolvedValue({ data: [] });
    refreshLeaderboardRpcMock.mockResolvedValue({ error: { message: 'mv refresh failed' } });

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.leaderboard_refreshed).toBe(false);
    expect(json.leaderboard_error).toBe('mv refresh failed');
  });

  it('returns the error envelope when cron auth rejects the request', async () => {
    const { ApiError } = await import('@/lib/api/errors');
    authorizeCronJobMock.mockRejectedValue(new ApiError(401, 'unauthorized', 'Invalid cron authorization'));

    const response = await POST(cronRequest());
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(errorEnvelopeSchema.safeParse(json).success).toBe(true);
    expect(json.error.code).toBe('unauthorized');
  });
});
