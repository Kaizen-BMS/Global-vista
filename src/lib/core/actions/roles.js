import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete, NOT_DELETED } from "@/lib/helpers/db";

export async function listRoles() {
  const [rows] = await pool.query(
    `SELECT r.*, (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id AND u.is_deleted = 0) AS user_count
     FROM roles r WHERE r.${NOT_DELETED} ORDER BY r.name ASC`
  );
  return rows;
}

export async function getRoleById(id) {
  const [rows] = await pool.query(`SELECT * FROM roles WHERE id = ? AND ${NOT_DELETED} LIMIT 1`, [id]);
  return rows[0] || null;
}

export async function getRoleAssignedUserCount(id) {
  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE role_id = ? AND is_deleted = 0`, [id]);
  return count;
}

export async function listPermissions() {
  const [rows] = await pool.query(`SELECT * FROM permissions WHERE status='active' ORDER BY module, name ASC`);
  return rows;
}

export async function getRolePermissionIds(roleId) {
  const [rows] = await pool.query(`SELECT permission_id FROM role_permissions WHERE role_id = ?`, [roleId]);
  return rows.map((r) => r.permission_id);
}

export async function createRole({ name, slug, description, createdBy }) {
  const [result] = await pool.query(
    `INSERT INTO roles (name, slug, description, created_by, updated_by) VALUES (?, ?, ?, ?, ?)`,
    [name, slug, description || null, createdBy, createdBy]
  );
  await logActivity({ userId: createdBy, module: "roles", action: "create", entityType: "role", entityId: result.insertId, description: `Created role ${name}` });
  return result.insertId;
}

export async function updateRole(id, { name, description }, updatedBy) {
  await pool.query(
    `UPDATE roles SET name = ?, description = ?, updated_by = ? WHERE id = ? AND ${NOT_DELETED} AND is_system = 0`,
    [name, description || null, updatedBy, id]
  );
  await logActivity({ userId: updatedBy, module: "roles", action: "update", entityType: "role", entityId: id, description: `Updated role #${id}` });
}

/**
 * Reassigns every user currently on `fromRoleId` to `toRoleId`, then
 * deletes `fromRoleId`. Required before a role with assigned users can
 * be removed — the API layer enforces `toRoleId` was supplied when
 * `getRoleAssignedUserCount` > 0.
 */
export async function deleteRole(id, deletedBy, reassignToRoleId = null) {
  const role = await getRoleById(id);
  if (!role) {
    const err = new Error("Role not found.");
    err.status = 404;
    throw err;
  }
  if (role.is_system) {
    const err = new Error("System roles cannot be deleted.");
    err.status = 400;
    throw err;
  }

  const assignedCount = await getRoleAssignedUserCount(id);
  if (assignedCount > 0) {
    if (!reassignToRoleId) {
      const err = new Error(`This role has ${assignedCount} assigned user(s). Choose a role to reassign them to before deleting.`);
      err.status = 400;
      err.requiresReassignment = true;
      err.assignedCount = assignedCount;
      throw err;
    }
    if (Number(reassignToRoleId) === Number(id)) {
      const err = new Error("Cannot reassign to the same role being deleted.");
      err.status = 400;
      throw err;
    }
    const targetRole = await getRoleById(reassignToRoleId);
    if (!targetRole) {
      const err = new Error("Reassignment target role not found.");
      err.status = 400;
      throw err;
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(`UPDATE users SET role_id = ?, updated_by = ? WHERE role_id = ?`, [reassignToRoleId, deletedBy, id]);
      await conn.query(`UPDATE roles SET is_deleted = 1, deleted_at = NOW(), deleted_by = ? WHERE id = ?`, [deletedBy, id]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    await logActivity({
      userId: deletedBy, module: "roles", action: "delete_with_reassignment", entityType: "role", entityId: id,
      description: `Deleted role #${id}, reassigned ${assignedCount} user(s) to role #${reassignToRoleId}`,
    });
    return;
  }

  await softDelete("roles", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "roles", action: "delete", entityType: "role", entityId: id, description: `Soft-deleted role #${id}` });
}

export async function syncRolePermissions(roleId, permissionIds, updatedBy) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    if (permissionIds.length > 0) {
      const values = permissionIds.map((pid) => [roleId, pid]);
      await conn.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES ?`, [values]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity({ userId: updatedBy, module: "roles", action: "update_permissions", entityType: "role", entityId: roleId, description: `Updated permissions for role #${roleId}` });
}