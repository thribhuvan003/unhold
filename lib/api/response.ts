import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ZodError } from 'zod';
import { ApiError, type ApiErrorBody } from '@/lib/api/errors';

export const REQUEST_ID_HEADER = 'x-request-id';

export function getRequestId(request: NextRequest): string {
  const existing = request.headers.get(REQUEST_ID_HEADER);
  if (existing) return existing;
  return `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function errorEnvelope(
  code: ApiErrorBody['code'],
  message: string,
  requestId: string,
  options?: { guard?: string; doc_url?: string },
): { error: ApiErrorBody } {
  return {
    error: {
      code,
      message,
      request_id: requestId,
      ...(options?.guard ? { guard: options.guard } : {}),
      ...(options?.doc_url ? { doc_url: options.doc_url } : {}),
    },
  };
}

export function jsonSuccess<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function jsonError(
  status: number,
  code: ApiErrorBody['code'],
  message: string,
  requestId: string,
  options?: { guard?: string; doc_url?: string },
): NextResponse {
  return NextResponse.json(errorEnvelope(code, message, requestId, options), { status });
}

export function handleRouteError(error: unknown, requestId: string): NextResponse {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, requestId, {
      guard: error.guard,
    });
  }
  if (error instanceof ZodError) {
    const message = error.issues[0]?.message ?? 'Validation failed';
    return jsonError(400, 'validation_failed', message, requestId);
  }
  console.error('[api]', requestId, error);
  return jsonError(500, 'internal_error', 'An unexpected error occurred', requestId);
}

export async function parseJsonBody<T>(
  request: NextRequest,
  requestId: string,
): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, 'validation_failed', 'Invalid JSON body');
  }
}