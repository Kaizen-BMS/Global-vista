import "server-only";
import { pool } from "@/lib/db";

/**
 * Super Admin sits above the role/permission system entirely.
 * Every authorization check MUST route through here — never check
 * `permissions.includes(x)` directly against a session anywhere else.
 */
export function isSuperAdmin(session) {
  return !!session?.is_super_admin;
}

export async function getRolePermissionSlugs(roleId) {
  const [rows] = await pool.query(
    `SELECT p.slug FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id
     WHERE rp.role_id = ? AND p.status = 'active' AND r.is_deleted = 0`,
    [roleId]
  );
  return rows.map((r) => r.slug);
}

export async function can(session, permissionSlug) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true; // Super Admin bypasses everything, always.
  const slugs = await getRolePermissionSlugs(session.role_id);
  return slugs.includes(permissionSlug);
}

export async function canAny(session, permissionSlugs = []) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  const slugs = await getRolePermissionSlugs(session.role_id);
  return permissionSlugs.some((p) => slugs.includes(p));
}

export async function canAll(session, permissionSlugs = []) {
  if (!session) return false;
  if (isSuperAdmin(session)) return true;
  const slugs = await getRolePermissionSlugs(session.role_id);
  return permissionSlugs.every((p) => slugs.includes(p));
}

/** Throws-free guard for use inside route handlers. */
export async function assertPermission(session, permissionSlug) {
  const allowed = await can(session, permissionSlug);
  if (!allowed) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

/** Only Super Admin — for irreversible/system-owner-only actions. */
export function assertSuperAdmin(session) {
  if (!isSuperAdmin(session)) {
    const err = new Error("Forbidden — Super Admin only");
    err.status = 403;
    throw err;
  }
}