import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "gv_crm_csrf";

export async function issueCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by client JS to echo in header
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // matches the longest possible session (remember me)
    path: "/",
  });
  return token;
}

/**
 * Verifies the double-submit CSRF pattern. Supports both JSON requests
 * (header only) and FormData/multipart requests (header only — we don't
 * require a body field, since that would mean parsing the body twice,
 * which breaks file upload streams). The header is the single source of
 * truth for both content types.
 */
export async function verifyCsrf(request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  } catch {
    return false;
  }
}

export const CSRF_COOKIE_NAME = CSRF_COOKIE;