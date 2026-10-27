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
        `SELECT us.revoked_at, c.status AS company_status, c.parent_company_id, c.can_create_child_companies
         FROM user_sessions us LEFT JOIN companies c ON c.id = ?
         WHERE us.jti = ? LIMIT 1`,
        [payload.company_id || null, payload.jti]
      );
      if (row?.revoked_at) return null;
      if (payload.company_id && !payload.is_platform_operator) {
        payload.company_status = row?.company_status || null;
        // Whether the CURRENTLY active company_id (home or switched-into
        // child, whichever the session is presently scoped to) is itself
        // a child company — re-checked fresh every request, same
        // guarantee as company_status above, never trusted from the
        // signed JWT alone. This is what lets permissions.js/workspace
        // layout.js bypass the subscription-required gate for exactly
        // this company, without a second query anywhere else.
        payload.is_child_company = !!row?.parent_company_id;
        // The actual parent id itself (not just the boolean above) — lets
        // a child company (e.g. a school) look up and display its
        // PARENT's own broadcast announcements on its own dashboard (see
        // getLatestParentAnnouncement in messaging.js). Same freshness
        // guarantee as every other field read from this query.
        payload.parent_company_id = row?.parent_company_id || null;
        // Same freshness guarantee — whether THIS company (e.g. Global
        // Vista Educators) is allowed to create its own child companies
        // from its own Settings page, re-checked every request so a
        // Platform Operator revoking this takes effect immediately.
        payload.can_create_child_companies = !!row?.can_create_child_companies;
      }
      pool.query(`UPDATE user_sessions SET last_seen_at = NOW() WHERE jti = ?`, [payload.jti]).catch(() => {});
    }
    return payload;
  } catch { return null; }
}
// Active-role switching: re-signs the session cookie with a new
// role_id/role_slug, keeping the same jti (so user_sessions
// revocation/last_seen tracking is untouched) and the same absolute
// expiry (payload.exp, not a fresh window) so switching roles never
// extends or resets how long the session lasts. Every existing can()/RLS
// check reads session.role_id fresh on each call, so this one write is
// the entire enforcement mechanism — nothing else needs to change to
// make permissions, nav, and data visibility respect the new role.
export async function reissueSessionWithRole(payload, roleId, roleSlug) {
  const { iat, exp, ...rest } = payload;
  const token = await new SignJWT({ ...rest, role_id: roleId, role_slug: roleSlug })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(exp).sign(getSecret());
  const cookieStore = await cookies();
  const maxAge = Math.max(1, exp - Math.floor(Date.now() / 1000));
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge, path: "/" });
}

// Parent-company Super Admin "switch into" a child company's real
// workspace — same mechanism as reissueSessionWithRole just above
// (same jti, so user_sessions revocation/last_seen tracking is
// untouched; same absolute exp, so switching never extends session
// life), except this one changes company_id + role_id + role_slug
// together. Every can()/RLS/query in the app reads those three fields
// fresh off the session on every request — nothing re-validates them
// against the users table — so this one write is the entire mechanism
// that makes the whole existing /workspace app work correctly for a
// different company, with zero other code changes anywhere.
//
// home_company_id/home_role_id/home_role_slug record the TRUE original
// identity, and are set ONLY the first time (never overwritten if
// already present) — so however this got called, "exit" always
// restores the real identity exactly. The caller (switchIntoChildCompany
// in src/lib/actions/companySwitch.js) additionally refuses to call this
// at all when already switched, so multi-hop child-to-child switching
// without returning home first is structurally impossible, not just
// discouraged.
export async function reissueSessionWithCompany(payload, { companyId, roleId, roleSlug }) {
  const { iat, exp, ...rest } = payload;
  const alreadySwitched = !!rest.home_company_id;
  const home = alreadySwitched
    ? { home_company_id: rest.home_company_id, home_role_id: rest.home_role_id, home_role_slug: rest.home_role_slug }
    : { home_company_id: rest.company_id, home_role_id: rest.role_id, home_role_slug: rest.role_slug };
  const token = await new SignJWT({ ...rest, ...home, company_id: companyId, role_id: roleId, role_slug: roleSlug })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(exp).sign(getSecret());
  const cookieStore = await cookies();
  const maxAge = Math.max(1, exp - Math.floor(Date.now() / 1000));
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge, path: "/" });
}

// Reverses reissueSessionWithCompany exactly — restores company_id/
// role_id/role_slug from the home_* claims and strips them, so the
// resulting session is indistinguishable from one that was never
// switched at all. A no-op if the session isn't currently switched.
export async function reissueSessionExitingToHome(payload) {
  const { iat, exp, home_company_id, home_role_id, home_role_slug, ...rest } = payload;
  if (!home_company_id) return;
  const token = await new SignJWT({ ...rest, company_id: home_company_id, role_id: home_role_id, role_slug: home_role_slug })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(exp).sign(getSecret());
  const cookieStore = await cookies();
  const maxAge = Math.max(1, exp - Math.floor(Date.now() / 1000));
  cookieStore.set(SESSION_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge, path: "/" });
}

export async function verifySessionToken(token) { try { const { payload } = await jwtVerify(token, getSecret()); return payload; } catch { return null; } }
export async function getUserByEmail(email) {
  const [rows] = await pool.query(`SELECT u.*, r.slug AS role_slug, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.email = ? LIMIT 1`, [email]);
  return rows[0] || null;
}
export const SESSION_COOKIE_NAME = SESSION_COOKIE;