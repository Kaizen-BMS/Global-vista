import { pool } from "@/lib/db";

export async function getRolePermissions(roleId) {
  const [rows] = await pool.query(
    `SELECT p.slug FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ? AND p.status = 'active'`,
    [roleId]
  );
  return rows.map((r) => r.slug);
}

export async function hasPermission(session, permissionSlug) {
  if (!session) return false;
  if (session.is_super_admin) return true;
  const perms = await getRolePermissions(session.role_id);
  return perms.includes(permissionSlug);
}

export function requirePermission(session, permissionSlug) {
  return hasPermission(session, permissionSlug);
}