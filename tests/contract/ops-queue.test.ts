import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/ops/operator-auth', () => ({
  requireOperator: vi.fn(),
}));

vi.mock('@/lib/ops/human-gate', () => ({
  listPendingHumanGates: vi.fn(),
}));

import { GET } from '@/app/api/v1/ops/queue/route';
import { requireOperator } from '@/lib/ops/operator-auth';
import { listPendingHumanGates } from '@/lib/ops/human-gate';
import { ApiError } from '@/lib/api/errors';

describe('GET /api/v1/ops/queue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without operator JWT', async () => {
    vi.mocked(requireOperator).mockRejectedValue(
      new ApiError(401, 'unauthorized', 'Operator authentication required'),
    );

    const request = new NextRequest('http://localhost/api/v1/ops/queue');
    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe('unauthorized');
  });

  it('returns queue for operator', async () => {
    vi.mocked(requireOperator).mockResolvedValue({
      userId: 'op-1',
      role: 'operator',
    });
    vi.mocked(listPendingHumanGates).mockResolvedValue([
      {
        id: 'gate-1',
        case_id: 'case-1',
        queue_reason: 'intake_low_confidence',
        priority: 60,
        status: 'pending',
        assigned_to: null,
        created_at: '2026-06-20T00:00:00.000Z',
        cases: {
          public_id: 'LL-10001',
          status: 'human_escalation',
          escalation_level: 'L1',
          bank_id: null,
          created_at: '2026-06-01T00:00:00.000Z',
        },
      },
    ] as never);

    const request = new NextRequest('http://localhost/api/v1/ops/queue');
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.queue).toHaveLength(1);
    expect(body.operator.role).toBe('operator');
  });
});