import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { REQUEST_ID_HEADER } from '@/lib/api/response';

export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ??
    `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/static|_next/image|favicon.ico).*)'],
};