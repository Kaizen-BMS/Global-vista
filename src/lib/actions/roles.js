import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete } from "@/lib/helpers/db";
import { createNotification } from "@/lib/actions/notifications";

// Every company gets its OWN copy of every role (provisionCompany clones
// the company_id-IS-NULL "template" rows into company-scoped copies at
// signup — see provisioning.js) — so a company-facing read never needs to
// fall back to the global templates themselves. Doing so used to show a
// company's own "Admin"/"Super Admin" AND the untouched global template
// of the same name side by side as if they were two different roles.
// Those template rows still exist (provisioning would break without at
// least one to clone), they just aren't this tenant's to see or use.
export async function listRoles(session) {
  const [rows] = await pool.query(
    `SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id=r.id AND u.is_deleted=0 AND u.company_id=?) AS user_count
     FROM roles r WHERE r.is_deleted=0 AND r.company_id=? ORDER BY r.name`,
    [session.company_id, session.company_id]
  );
  return rows;
}
export async function getRoleById(session, id) {
  const [rows] = await pool.query(`SELECT * FROM roles WHERE id=? AND is_deleted=0 AND company_id=? LIMIT 1`, [id, session.company_id]);
  return rows[0] || null;
}
export async function getRoleAssignedUserCount(session, id) {
  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role_id=? AND is_deleted=0 AND company_id=?`, [id, session.company_id]);
  return count;
}
export async function listPermissions() {
  const [rows] = await pool.query(`SELECT * FROM permissions WHERE status='active' ORDER BY module, name`);
  return rows;
}
export async function getRolePermissionIds(id) {
  const [rows] = await pool.query(`SELECT permission_id FROM role_permissions WHERE role_id=?`, [id]);
  return rows.map((r) => r.permission_id);
}
export async function createRole(session, { name, slug, description, createdBy }) {
  const [result] = await pool.query(`INSERT INTO roles (company_id, name, slug, description, created_by, updated_by) VALUES (?,?,?,?,?,?)`, [session.company_id, name, slug, description || null, createdBy, createdBy]);
  await logActivity({ userId: createdBy, module: "roles", action: "create", entityType: "role", entityId: result.insertId, description: `Created role ${name}`, companyId: session.company_id });
  return result.insertId;
}
export async function updateRole(session, id, { name, description }, updatedBy) {
  await pool.query(`UPDATE roles SET name=?, description=?, updated_by=? WHERE id=? AND company_id=? AND is_deleted=0 AND is_system=0`, [name, description || null, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "roles", action: "update", entityType: "role", entityId: id, description: `Updated role #${id}`, companyId: session.company_id });
}
export async function deleteRole(session, id, deletedBy, reassignToRoleId = null) {
  const role = await getRoleById(session, id);
  if (!role) { const e = new Error("Role not found."); e.status = 404; throw e; }
  if (role.is_system) { const e = new Error("System roles cannot be deleted."); e.status = 400; throw e; }
  const assignedCount = await getRoleAssignedUserCount(session, id);
  if (assignedCount > 0) {
    if (!reassignToRoleId) { const e = new Error(`Role has ${assignedCount} assigned user(s).`); e.status = 400; e.requiresReassignment = true; e.assignedCount = assignedCount; throw e; }
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE users SET role_id=?, updated_by=? WHERE role_id=? AND company_id=?`, [reassignToRoleId, deletedBy, id, session.company_id]);
      await conn.query(`UPDATE roles SET is_deleted=1, deleted_at=NOW(), deleted_by=? WHERE id=?`, [deletedBy, id]);
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
    await logActivity({ userId: deletedBy, module: "roles", action: "delete_reassign", entityType: "role", entityId: id, description: `Deleted + reassigned ${assignedCount}`, companyId: session.company_id });
    return;
  }
  await softDelete("roles", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "roles", action: "delete", entityType: "role", entityId: id, description: `Deleted role #${id}`, companyId: session.company_id });
}
export async function syncRolePermissions(session, roleId, permissionIds, updatedBy) {
  const role = await getRoleById(session, roleId);
  if (!role) { const e = new Error("Role not found."); e.status = 404; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM role_permissions WHERE role_id=?`, [roleId]);
    if (permissionIds.length) await conn.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ?`, [permissionIds.map((pid) => [roleId, pid])]);
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await logActivity({ userId: updatedBy, module: "roles", action: "update_permissions", entityType: "role", entityId: roleId, description: `Updated permissions`, companyId: session.company_id });

  const [affectedUsers] = await pool.query(
    `SELECT id FROM users WHERE role_id=? AND company_id=? AND is_deleted=0 AND id != ?`,
    [roleId, session.company_id, updatedBy]
  );
  for (const u of affectedUsers) {
    await createNotification(session.company_id, u.id, {
      title: "Your permissions were updated",
      message: `Role "${role.name}" permissions changed`,
      type: "role_updated",
      link: `/workspace/profile`,
    });
  }
}