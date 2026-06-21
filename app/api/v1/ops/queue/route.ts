import type { NextRequest } from 'next/server';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { listPendingHumanGates } from '@/lib/ops/human-gate';
import { requireOperator } from '@/lib/ops/operator-auth';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const operator = await requireOperator(request);
    const queue = await listPendingHumanGates({ limit: 100 });

    return jsonSuccess({
      queue,
      operator: { id: operator.userId, role: operator.role },
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}