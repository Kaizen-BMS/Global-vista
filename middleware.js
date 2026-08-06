import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
const SESSION_COOKIE = "gv_crm_session";
const PUBLIC_PATHS = new Set(["/login", "/forgot-password", "/reset-password"]);
function getSecret() { return new TextEncoder().encode(process.env.CRM_JWT_SECRET); }

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/platform") || pathname.startsWith("/workspace");
  if (!isProtected && !PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.company_id) {
      const res = NextResponse.redirect(new URL("/login", request.url));
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }
    if (pathname.startsWith("/platform") && !payload.is_platform_operator) return NextResponse.redirect(new URL("/workspace/dashboard", request.url));
    if (pathname.startsWith("/workspace") && payload.is_platform_operator) return NextResponse.redirect(new URL("/platform", request.url));

    const headers = new Headers(request.headers);
    headers.set("x-company-id", String(payload.company_id));
    headers.set("x-user-id", String(payload.id));
    return NextResponse.next({ request: { headers } });
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }
}
export const config = { matcher: ["/platform/:path*", "/workspace/:path*", "/login", "/forgot-password", "/reset-password"] };