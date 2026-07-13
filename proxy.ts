import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { REQUEST_ID_HEADER } from "@/lib/api/response";

const intlMiddleware = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const requestId =
    request.headers.get(REQUEST_ID_HEADER) ??
    `req_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

  // /api/* is not localized — inject a request ID downstream and echo it.
  if (request.nextUrl.pathname.startsWith("/api")) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(REQUEST_ID_HEADER, requestId);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // Locale routing still gets a stable request ID on rewrites and redirects.
  const response = intlMiddleware(request);
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
