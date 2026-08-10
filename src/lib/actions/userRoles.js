import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdminAccount } from "@/lib/helpers/permissions";

export async function listUserRoles(session, userId) {
  const [[user]] = await pool.query(`SELECT id FROM users WHERE id=? AND company_id=? AND is_deleted=0`, [userId, session.company_id]);
  if (!user) { const e = new Error("User not found in this company."); e.status = 404; throw e; }
  const [rows] = await pool.query(
    `SELECT ur.role_id, ur.is_default, r.name, r.slug
     FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.is_deleted = 0
     ORDER BY ur.is_default DESC, r.name ASC`,
    [userId]
  );
  return rows;
}

// Same company-or-system-template rule bulkAssignRole already uses in
// users.js — a role is assignable if it belongs to this tenant, or is one
// of the NULL-company system role templates.
async function assertRoleInCompany(companyId, roleId) {
  const [[role]] = await pool.query(`SELECT id, name, slug FROM roles WHERE id=? AND (company_id=? OR company_id IS NULL) AND is_deleted=0 LIMIT 1`, [roleId, companyId]);
  if (!role) { const e = new Error("Role not found in this company."); e.status = 404; throw e; }
  return role;
}

export async function assignUserRole(session, userId, roleId, assignedBy) {
  const [[user]] = await pool.query(`SELECT id FROM users WHERE id=? AND company_id=? AND is_deleted=0`, [userId, session.company_id]);
  if (!user) { const e = new Error("User not found in this company."); e.status = 404; throw e; }
  const role = await assertRoleInCompany(session.company_id, roleId);

  const [[existing]] = await pool.query(`SELECT COUNT(*) AS c FROM user_roles WHERE user_id=?`, [userId]);
  const isFirst = existing.c === 0;
  const [result] = await pool.query(
    `INSERT IGNORE INTO user_roles (user_id, role_id, is_default, created_by) VALUES (?, ?, ?, ?)`,
    [userId, roleId, isFirst ? 1 : 0, assignedBy]
  );
  if (result.affectedRows === 0) { const e = new Error("That role is already assigned to this user."); e.status = 400; throw e; }
  if (isFirst) await pool.query(`UPDATE users SET role_id=? WHERE id=?`, [roleId, userId]);

  await logActivity({ userId: assignedBy, module: "users", action: "role_assign", entityType: "user", entityId: userId, companyId: session.company_id, description: `Assigned role "${role.name}" to user #${userId}` });
}

export async function removeUserRole(session, userId, roleId, removedBy) {
  const [[user]] = await pool.query(`SELECT id FROM users WHERE id=? AND company_id=? AND is_deleted=0`, [userId, session.company_id]);
  if (!user) { const e = new Error("User not found in this company."); e.status = 404; throw e; }

  const [rows] = await pool.query(`SELECT role_id, is_default FROM user_roles WHERE user_id=?`, [userId]);
  if (rows.length <= 1) { const e = new Error("A user must have at least one assigned role."); e.status = 400; throw e; }
  const target = rows.find((r) => r.role_id === Number(roleId));
  if (!target) { const e = new Error("Role is not assigned to this user."); e.status = 404; throw e; }

  await pool.query(`DELETE FROM user_roles WHERE user_id=? AND role_id=?`, [userId, roleId]);

  if (target.is_default) {
    // Removing the default role would otherwise leave the user with no
    // default at all — promote whichever role remains so the "exactly one
    // default" invariant holds, and keep users.role_id (still read at
    // login) in sync with it.
    const next = rows.find((r) => r.role_id !== Number(roleId));
    await pool.query(`UPDATE user_roles SET is_default=1 WHERE user_id=? AND role_id=?`, [userId, next.role_id]);
    await pool.query(`UPDATE users SET role_id=? WHERE id=?`, [next.role_id, userId]);
  }

  await logActivity({ userId: removedBy, module: "users", action: "role_remove", entityType: "user", entityId: userId, companyId: session.company_id, description: `Removed role #${roleId} from user #${userId}` });
}

export async function setDefaultUserRole(session, userId, roleId, updatedBy) {
  const [[user]] = await pool.query(`SELECT id FROM users WHERE id=? AND company_id=? AND is_deleted=0`, [userId, session.company_id]);
  if (!user) { const e = new Error("User not found in this company."); e.status = 404; throw e; }
  const [[assigned]] = await pool.query(`SELECT id FROM user_roles WHERE user_id=? AND role_id=?`, [userId, roleId]);
  if (!assigned) { const e = new Error("Role is not assigned to this user."); e.status = 400; throw e; }

  await pool.query(`UPDATE user_roles SET is_default = (role_id = ?) WHERE user_id = ?`, [roleId, userId]);
  await pool.query(`UPDATE users SET role_id=? WHERE id=?`, [roleId, userId]);
  await logActivity({ userId: updatedBy, module: "users", action: "role_set_default", entityType: "user", entityId: userId, companyId: session.company_id, description: `Set default role to #${roleId} for user #${userId}` });
}

// Self-service active-role switch. The requested role_id is never trusted
// on its own. A permanent Company Super Admin (the raw is_super_admin
// account flag — checked here regardless of whatever role is CURRENTLY
// active, which is exactly what lets them switch back after switching
// away) may switch into any active role belonging to their own company.
// Every other user may only switch into a role that actually shows up in
// their own user_roles.
export async function switchActiveRole(session, roleId) {
  if (isSuperAdminAccount(session)) {
    const [[role]] = await pool.query(
      `SELECT id AS role_id, slug, name FROM roles WHERE id = ? AND company_id = ? AND is_deleted = 0 AND status = 'active' LIMIT 1`,
      [roleId, session.company_id]
    );
    if (!role) { const e = new Error("That role does not exist for this company."); e.status = 403; throw e; }
    await logActivity({
      userId: session.id, module: "users", action: "role_switch", entityType: "user", entityId: session.id,
      companyId: session.company_id, description: `${session.name} (Super Admin) switched active role to "${role.name}"`,
    });
    return { roleId: role.role_id, roleSlug: role.slug, roleName: role.name };
  }

  const [[assignment]] = await pool.query(
    `SELECT ur.role_id, r.slug, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND ur.role_id = ? AND r.is_deleted = 0 AND r.status = 'active' LIMIT 1`,
    [session.id, roleId]
  );
  if (!assignment) { const e = new Error("That role is not assigned to you."); e.status = 403; throw e; }
  await logActivity({
    userId: session.id, module: "users", action: "role_switch", entityType: "user", entityId: session.id,
    companyId: session.company_id, description: `${session.name} switched active role to "${assignment.name}"`,
  });
  return { roleId: assignment.role_id, roleSlug: assignment.slug, roleName: assignment.name };
}
