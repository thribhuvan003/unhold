export type ApiErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'conflict'
  | 'guard_failed'
  | 'idempotency_conflict'
  | 'internal_error';

export interface ApiErrorBody {
  code: ApiErrorCode;
  message: string;
  guard?: string;
  request_id: string;
  doc_url?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly guard?: string;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options?: { guard?: string },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.guard = options?.guard;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}