import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import { issueCsrfToken } from "@/lib/helpers/csrf";

const SESSION_COOKIE = "gv_crm_session";
const DEFAULT_MAX_AGE = 60 * 60 * 8;
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30;

function getSecret() { return new TextEncoder().encode(process.env.CRM_JWT_SECRET); }
export async function hashPassword(plain) { return bcrypt.hash(plain, 12); }
export async function verifyPassword(plain, hash) { return bcrypt.compare(plain, hash); }

export async function createSession(user, { ipAddress = null, userAgent = null, rememberMe = false } = {}) {
  const jti = crypto.randomUUID();
  const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_MAX_AGE;
  const token = await new SignJWT({
    id: user.id, name: user.name, email: user.email, role_id: user.role_id, role_slug: user.role_slug,
    is_super_admin: !!user.is_super_admin, is_platform_operator: !!user.is_platform_operator,
    company_id: user.company_id, must_change_password: !!user.must_change_password, jti,
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${maxAge}s`).sign(getSecret());

  await pool.query(`INSERT INTO user_sessions (user_id, jti, ip_address, user_agent) VALUES (?, ?, ?, ?)`, [user.id, jti, ipAddress, userAgent]);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge, path: "/" });
  await issueCsrfToken();
  return jti;
}
export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) { try { const { payload } = await jwtVerify(token, getSecret()); if (payload.jti) await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE jti = ?`, [payload.jti]); } catch {} }
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete("gv_crm_csrf");
}
export async function destroyAllSessions(userId, exceptJti = null) {
  await pool.query(`UPDATE user_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL ${exceptJti ? "AND jti != ?" : ""}`, exceptJti ? [userId, exceptJti] : [userId]);
}
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.jti) {
      // One round trip instead of two: session revocation and company
      // status (re-checked live on every request, never trusted from the
      // signed JWT, so a company suspended mid-session is enforced on its
      // very next request) used to be separate sequential queries — on a
      // remote DB host under any concurrent load, that latency doubles up
      // on literally every authenticated request in the app.
      const [[row]] = await pool.query(
        `SELECT us.revoked_at, c.status AS company_status
         FROM user_sessions us LEFT JOIN companies c ON c.id = ?
         WHERE us.jti = ? LIMIT 1`,
        [payload.company_id || null, payload.jti]
      );
      if (row?.revoked_at) return null;
      if (payload.company_id && !payload.is_platform_operator) payload.company_status = row?.company_status || null;
      pool.query(`UPDATE user_sessions SET last_seen_at = NOW() WHERE jti = ?`, [payload.jti]).catch(() => {});
    }
    return payload;
  } catch { return null; }
}
export async function verifySessionToken(token) { try { const { payload } = await jwtVerify(token, getSecret()); return payload; } catch { return null; } }
export async function getUserByEmail(email) {
  const [rows] = await pool.query(`SELECT u.*, r.slug AS role_slug, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}
export const SESSION_COOKIE_NAME = SESSION_COOKIE;