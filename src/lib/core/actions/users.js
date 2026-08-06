import "server-only";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { softDelete, paginate } from "@/lib/helpers/db";
import { sendWelcomeEmail } from "@/lib/helpers/email";

const VALID_STATUSES = new Set(["active", "inactive", "suspended"]);
const SORTABLE_COLUMNS = new Set(["name", "email", "created_at", "last_login_at", "status"]);

export async function listUsers({
  status = null, roleId = null, search = null, includeDeleted = false,
  sort = "created_at", dir = "DESC", page = 1, pageSize = 20,
} = {}) {
  const where = [includeDeleted ? "u.is_deleted = 1" : "u.is_deleted = 0"];
  const params = [];
  if (status) { where.push("u.status = ?"); params.push(status); }
  if (roleId) { where.push("u.role_id = ?"); params.push(roleId); }
  if (search) {
    where.push("(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.employee_id LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });
  const sortCol = SORTABLE_COLUMNS.has(sort) ? sort : "created_at";
  const sortDir = dir === "ASC" ? "ASC" : "DESC";

  const [rows] = await pool.query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.status, u.is_super_admin,
            u.last_login_at, u.created_at, u.locked_until, u.deleted_at,
            r.name AS role_name, r.slug AS role_slug, u.role_id,
            b.name AS branch_name, d.name AS department_name, ds.name AS designation_name
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN designations ds ON ds.id = u.designation_id
     ${whereSql}
     ORDER BY u.${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);

  return { users: rows, total, page: p, pageSize: size };
}

export async function getUserById(id) {
  const [rows] = await pool.query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.status, u.role_id, u.is_super_admin,
            u.last_login_at, u.created_at, u.joining_date, u.locked_until,
            r.name AS role_name, r.slug AS role_slug,
            b.name AS branch_name, u.branch_id,
            d.name AS department_name, u.department_id,
            ds.name AS designation_name, u.designation_id,
            et.name AS employee_type_name, u.employee_type_id,
            m.name AS manager_name, u.reporting_manager_id
     FROM users u
     JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN designations ds ON ds.id = u.designation_id
     LEFT JOIN employee_types et ON et.id = u.employee_type_id
     LEFT JOIN users m ON m.id = u.reporting_manager_id
     WHERE u.id = ? AND u.is_deleted = 0 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function generateEmployeeId() {
  const [[{ count }]] = await pool.query(`SELECT COUNT(*) AS count FROM users`);
  return `GVE-EMP-${String(count + 1).padStart(5, "0")}`;
}

export async function createUser(data, createdBy) {
  const { name, email, phone, password, roleId, branchId, departmentId, designationId, employeeTypeId, reportingManagerId, joiningDate, sendWelcome = true } = data;

  const tempPassword = password || crypto.randomBytes(6).toString("hex");
  const passwordHash = await hashPassword(tempPassword);
  const employeeId = await generateEmployeeId();

  const [result] = await pool.query(
    `INSERT INTO users (
      employee_id, name, email, phone, password_hash, role_id,
      branch_id, department_id, designation_id, employee_type_id, reporting_manager_id,
      joining_date, must_change_password, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      employeeId, name, email.trim().toLowerCase(), phone || null, passwordHash, roleId,
      branchId || null, departmentId || null, designationId || null, employeeTypeId || null, reportingManagerId || null,
      joiningDate || null, createdBy, createdBy,
    ]
  );

  await logActivity({
    userId: createdBy, module: "users", action: "create", entityType: "user",
    entityId: result.insertId, description: `Created user ${name} (${employeeId})`,
  });

  if (sendWelcome) {
    const [[role]] = await pool.query(`SELECT name FROM roles WHERE id = ?`, [roleId]);
    try {
      await sendWelcomeEmail({ to: email, userId: result.insertId, name, email, tempPassword, roleName: role?.name || "Employee", createdBy });
      await logActivity({ userId: createdBy, module: "users", action: "welcome_email_sent", entityType: "user", entityId: result.insertId, description: `Welcome email sent to ${email}` });
    } catch (err) {
      console.error("Welcome email failed:", err);
      await logActivity({ userId: createdBy, module: "users", action: "welcome_email_failed", entityType: "user", entityId: result.insertId, description: `Welcome email failed for ${email}` });
    }
  }

  return getUserById(result.insertId);
}

export async function updateUser(id, data, updatedBy) {
  const { name, email, phone, roleId, status, branchId, departmentId, designationId, employeeTypeId, reportingManagerId, joiningDate } = data;
  await pool.query(
    `UPDATE users SET name = ?, email = ?, phone = ?, role_id = ?, status = ?,
      branch_id = ?, department_id = ?, designation_id = ?, employee_type_id = ?, reporting_manager_id = ?,
      joining_date = ?, updated_by = ?
     WHERE id = ? AND is_deleted = 0`,
    [
      name, email.trim().toLowerCase(), phone || null, roleId, status,
      branchId || null, departmentId || null, designationId || null, employeeTypeId || null, reportingManagerId || null,
      joiningDate || null, updatedBy, id,
    ]
  );

  await logActivity({ userId: updatedBy, module: "users", action: "update", entityType: "user", entityId: id, description: `Updated user #${id}` });
  return getUserById(id);
}

export async function setUserStatus(id, status, updatedBy) {
  if (!VALID_STATUSES.has(status)) {
    const err = new Error(`Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`);
    err.status = 400;
    throw err;
  }
  await pool.query(`UPDATE users SET status = ?, updated_by = ? WHERE id = ? AND is_deleted = 0`, [status, updatedBy, id]);
  await logActivity({
    userId: updatedBy, module: "users",
    action: status === "active" ? "activate" : status === "suspended" ? "suspend" : "deactivate",
    entityType: "user", entityId: id, description: `User #${id} set to ${status}`,
  });
}

export async function resetUserPassword(id, newPassword, updatedBy) {
  const passwordHash = await hashPassword(newPassword);
  await pool.query(`UPDATE users SET password_hash = ?, must_change_password = 1, updated_by = ? WHERE id = ? AND is_deleted = 0`, [passwordHash, updatedBy, id]);
  await logActivity({ userId: updatedBy, module: "users", action: "reset_password", entityType: "user", entityId: id, description: `Password reset for user #${id} by admin` });
}

export async function deleteUser(id, deletedBy) {
  await softDelete("users", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "users", action: "delete", entityType: "user", entityId: id, description: `Soft-deleted user #${id}` });
}

export async function restoreUser(id, updatedBy) {
  await pool.query(`UPDATE users SET is_deleted = 0, deleted_at = NULL, deleted_by = NULL, status = 'active', updated_by = ? WHERE id = ?`, [updatedBy, id]);
  await logActivity({ userId: updatedBy, module: "users", action: "restore", entityType: "user", entityId: id, description: `Restored user #${id}` });
}

export async function bulkSetUserStatus(ids, status, updatedBy) {
  if (!ids.length) return;
  if (!VALID_STATUSES.has(status)) {
    const err = new Error(`Invalid status. Must be one of: ${[...VALID_STATUSES].join(", ")}`);
    err.status = 400;
    throw err;
  }
  await pool.query(`UPDATE users SET status = ?, updated_by = ? WHERE id IN (?) AND is_deleted = 0 AND is_super_admin = 0`, [status, updatedBy, ids]);
  await logActivity({ userId: updatedBy, module: "users", action: "bulk_status_change", entityType: "user", description: `Bulk status update to ${status} for ${ids.length} users`, meta: { ids, status } });
}

export async function bulkAssignRole(ids, roleId, updatedBy) {
  if (!ids.length) return;
  await pool.query(`UPDATE users SET role_id = ?, updated_by = ? WHERE id IN (?) AND is_deleted = 0 AND is_super_admin = 0`, [roleId, updatedBy, ids]);
  await logActivity({ userId: updatedBy, module: "users", action: "bulk_role_assign", entityType: "user", description: `Bulk role assignment for ${ids.length} users`, meta: { ids, roleId } });
}