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

  const pathname = request.nextUrl.pathname;

  // Uptime probes must never hit next-intl locale routing (that produced a soft
  // HTML 404 for /healthz even though vercel.json rewrote to /api/v1/health).
  if (pathname === "/healthz" || pathname === "/health") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/v1/health";
    const response = NextResponse.rewrite(url);
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  }

  // /api/* is not localized — inject a request ID downstream and echo it.
  if (pathname.startsWith("/api")) {
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
    "/healthz",
    "/health",
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|manifest\\.webmanifest|.*\\..*).*)",
  ],
};
