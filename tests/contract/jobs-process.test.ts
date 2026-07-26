import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertCronAuthMock = vi.fn();
const processAgentJobsMock = vi.fn();
const runErasureBatchMock = vi.fn();

vi.mock('@/lib/api/cron-auth', () => ({
  assertCronAuth: (...args: unknown[]) => assertCronAuthMock(...args),
}));

vi.mock('@/lib/jobs/process', () => ({
  processAgentJobs: (...args: unknown[]) => processAgentJobsMock(...args),
}));

vi.mock('@/lib/data-rights/erasure', () => ({
  runErasureBatch: (...args: unknown[]) => runErasureBatchMock(...args),
}));

import { GET, POST } from '@/app/api/v1/internal/jobs/process/route';

describe('/api/v1/internal/jobs/process', () => {
  beforeEach(() => {
    assertCronAuthMock.mockReset();
    processAgentJobsMock.mockReset();
    runErasureBatchMock.mockReset();
    assertCronAuthMock.mockReturnValue(null);
    runErasureBatchMock.mockResolvedValue({ processed: 2, deleted: 1 });
  });

  it('rejects an unauthorized Vercel Cron GET without doing work', async () => {
    assertCronAuthMock.mockReturnValue(
      Response.json({ error: 'unauthorized' }, { status: 401 }),
    );

    const response = await GET(
      new Request('http://localhost/api/v1/internal/jobs/process'),
    );

    expect(response.status).toBe(401);
    expect(runErasureBatchMock).not.toHaveBeenCalled();
    expect(processAgentJobsMock).not.toHaveBeenCalled();
  });

  it('runs erasures and agent jobs from an authorized Vercel Cron GET', async () => {
    processAgentJobsMock
      .mockResolvedValueOnce({
        processed: 3,
        succeeded: 2,
        failed: 1,
        reclaimed: 0,
      })
      .mockResolvedValue({
        processed: 0,
        succeeded: 0,
        failed: 0,
        reclaimed: 0,
      });

    const request = new Request('http://localhost/api/v1/internal/jobs/process', {
      headers: { authorization: 'Bearer cron-secret' },
    });

    const response = await GET(request);
    const json = await response.json();

    expect(assertCronAuthMock).toHaveBeenCalledWith(request);
    expect(runErasureBatchMock).toHaveBeenCalledOnce();
    expect(processAgentJobsMock).toHaveBeenCalledWith({ limit: 8 });
    expect(json.processed).toBe(3);
    expect(json.succeeded).toBe(2);
    expect(json.failed).toBe(1);
    expect(json.reclaimed).toBe(0);
    expect(json.erasures).toEqual({ processed: 2, deleted: 1 });
    expect(typeof json.elapsed_ms).toBe('number');
  });

  it('preserves the manual POST limit', async () => {
    processAgentJobsMock.mockResolvedValue({
      processed: 0,
      succeeded: 0,
      failed: 0,
      reclaimed: 0,
    });
    const request = new Request('http://localhost/api/v1/internal/jobs/process', {
      method: 'POST',
      body: JSON.stringify({ limit: 7 }),
    });

    await POST(request);

    expect(processAgentJobsMock).toHaveBeenCalledWith({ limit: 7 });
  });
});
