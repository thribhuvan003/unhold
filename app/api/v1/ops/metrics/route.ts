import type { NextRequest } from 'next/server';
import { getRequestId, handleRouteError, jsonSuccess } from '@/lib/api/response';
import { collectOpsMetrics } from '@/lib/ops/metrics';
import { requireOperator } from '@/lib/ops/operator-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);
  try {
    const operator = await requireOperator(request);

    const windowParam = Number(new URL(request.url).searchParams.get('days'));
    const windowDays = Number.isFinite(windowParam) && windowParam > 0 ? Math.min(windowParam, 90) : 30;

    const metrics = await collectOpsMetrics(windowDays);

    return jsonSuccess({
      metrics,
      operator: { id: operator.userId, role: operator.role },
      request_id: requestId,
    });
  } catch (error) {
    return handleRouteError(error, requestId);
  }
}
