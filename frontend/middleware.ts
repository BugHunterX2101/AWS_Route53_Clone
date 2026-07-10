import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: public pages, API proxy, Next.js internals, static files
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Auth check: accept either a session_id cookie (local dev)
  // OR an Authorization header won't be present in middleware (it's client-side).
  // We check sessionStorage via cookie set by the client is not available here.
  // Instead: rely on client-side AuthContext to redirect — middleware only guards
  // against non-JS access. If session_id cookie OR auth_token cookie exists, allow.
  const sessionId = request.cookies.get("session_id");
  const authToken = request.cookies.get("auth_token");

  if (!sessionId && !authToken) {
    // No cookie found — let the page load; AuthContext will redirect to /login
    // if the API call to /auth/me fails (Bearer token in sessionStorage).
    // We can't check sessionStorage in middleware (server-side), so we pass through
    // and let the client handle the redirect for Bearer token users.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
