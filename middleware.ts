import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { REQUEST_ID_HEADER } from '@/lib/api/response';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ??
    `req_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  // /api/* is not localized — keep the original behaviour: inject the request-id
  // into the downstream request headers and echo it on the response.
  if (request.nextUrl.pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Everything else goes through next-intl's locale routing; we still stamp the
  // request-id onto whatever response it produces (rewrite / redirect / next).
  const response = intlMiddleware(request);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  // Skip SEO machine files so next-intl does not 404 them into a locale.
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)',
  ],
};
