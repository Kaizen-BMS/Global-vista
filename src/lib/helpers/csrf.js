import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const CSRF_COOKIE = "gv_crm_csrf";

export async function issueCsrfToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE, token, {
    httpOnly: false, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return token;
}

export async function verifyCsrf(request) {
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get("x-csrf-token");
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  try { return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken)); }
  catch { return false; }
}

export const CSRF_COOKIE_NAME = CSRF_COOKIE;