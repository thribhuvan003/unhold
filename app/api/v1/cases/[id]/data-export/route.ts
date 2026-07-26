import { NextRequest, NextResponse } from 'next/server';
import { appendActionLog } from '@/lib/action-logs/append';
import { ApiError } from '@/lib/api/errors';
import { requireDirectCaseOwner } from '@/lib/api/case-access';
import { getRequestId, handleRouteError } from '@/lib/api/response';
import {
  buildCaseDataExport,
  CaseDataExportError,
} from '@/lib/data-rights/export';

export const runtime = 'nodejs';
export const maxDuration = 300;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const requestId = getRequestId(request);
  try {
    const { id: caseId } = await context.params;
    const auth = await requireDirectCaseOwner(request, caseId);
    const result = await buildCaseDataExport(caseId);

    // A download must still succeed if non-essential audit logging is briefly
    // unavailable. No exported content, filenames, or storage paths are logged.
    try {
      await appendActionLog({
        caseId,
        actorType: auth.actorType,
        actorId: auth.actorId,
        action: 'case.data_exported',
        payload: { export: 'case_data' },
        requestId,
      });
    } catch {
      // Best-effort only.
    }

    const response = new NextResponse(result.bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    if (error instanceof CaseDataExportError) {
      const status = error.code === 'case_not_found' ? 404 : 422;
      return handleRouteError(new ApiError(status, status === 404 ? 'not_found' : 'guard_failed', error.message, {
        guard: error.code,
      }), requestId);
    }
    return handleRouteError(error, requestId);
  }
}
