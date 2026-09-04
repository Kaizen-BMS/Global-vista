import "server-only";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { softDelete, paginate } from "@/lib/helpers/db";
import { sendWelcomeEmail } from "@/lib/helpers/email";
import { createNotification } from "@/lib/actions/notifications";
import { enforceUserLimit } from "@/lib/platform/tenant";

const VALID_STATUSES = new Set(["active", "inactive", "suspended"]);
const SORTABLE = new Set(["name", "email", "created_at", "last_login_at", "status"]);

export async function listUsers(session, { status = null, roleId = null, search = null, includeDeleted = false, sort = "created_at", dir = "DESC", page = 1, pageSize = 20 } = {}) {
  const where = [`u.company_id = ?`, includeDeleted ? "u.is_deleted = 1" : "u.is_deleted = 0"];
  const params = [session.company_id];
  if (status) { where.push("u.status = ?"); params.push(status); }
  if (roleId) { where.push("u.role_id = ?"); params.push(roleId); }
  if (search) { where.push("(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)"); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });
  const sortCol = SORTABLE.has(sort) ? sort : "created_at";

  const [rows] = await pool.query(
    `SELECT u.id, u.employee_id, u.name, u.email, u.phone, u.status, u.is_super_admin, u.last_login_at, u.created_at, u.locked_until,
            r.name AS role_name, r.slug AS role_slug, u.role_id, b.name AS branch_name, d.name AS department_name, ds.name AS designation_name
     FROM users u JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id LEFT JOIN departments d ON d.id = u.department_id LEFT JOIN designations ds ON ds.id = u.designation_id
     ${whereSql} ORDER BY u.${sortCol} ${dir === "ASC" ? "ASC" : "DESC"} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u ${whereSql}`, params);
  return { users: rows, total, page: p, pageSize: size };
}

export async function getUserById(session, id) {
  const [rows] = await pool.query(
    `SELECT u.*, r.name AS role_name, r.slug AS role_slug, b.name AS branch_name, d.name AS department_name,
            ds.name AS designation_name, et.name AS employee_type_name, m.name AS manager_name
     FROM users u JOIN roles r ON r.id = u.role_id
     LEFT JOIN branches b ON b.id = u.branch_id LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN designations ds ON ds.id = u.designation_id LEFT JOIN employee_types et ON et.id = u.employee_type_id
     LEFT JOIN users m ON m.id = u.reporting_manager_id
     WHERE u.id = ? AND u.company_id = ? AND u.is_deleted = 0 LIMIT 1`,
    [id, session.company_id]
  );
  return rows[0] || null;
}

// employee_id carries a GLOBAL unique constraint (not scoped to company_id —
// confirmed against the live schema), so a prefix shared by every tenant
// guarantees cross-company collisions the moment two companies' sequences
// reach the same number. The prefix is derived from the company's own slug
// so each tenant gets its own namespace. The count is MAX(existing suffix)
// scoped to that prefix, not COUNT(*) — COUNT breaks the instant any user
// is soft-deleted (the count drops, so "next" reissues an already-taken
// number); MAX never goes backwards.
async function generateEmployeeId(companyId) {
  const [[company]] = await pool.query(`SELECT slug FROM companies WHERE id = ?`, [companyId]);
  const prefix = (company?.slug || "EMP").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "EMP";
  const [[{ maxNum }]] = await pool.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING_INDEX(employee_id, '-', -1) AS UNSIGNED)), 0) AS maxNum
     FROM users WHERE company_id = ? AND employee_id LIKE ?`,
    [companyId, `${prefix}-%`]
  );
  return `${prefix}-${String(maxNum + 1).padStart(5, "0")}`;
}

export async function createUser(session, data, createdBy) {
  await enforceUserLimit(session.company_id);
  const { name, email, phone, password, roleId, roleIds, branchId, departmentId, designationId, employeeTypeId, reportingManagerId, joiningDate, sendWelcome = true } = data;
  const tempPassword = password || crypto.randomBytes(6).toString("hex");
  const passwordHash = await hashPassword(tempPassword);

  // MAX-based generation closes the gap-from-deletion hole but not a true
  // race between two concurrent creates for the same company — both could
  // read the same MAX before either INSERT lands. Retrying specifically on
  // an employee_id collision (never on an email collision, which is a real
  // validation error the caller needs to see) makes this safe either way.
  let result;
  for (let attempt = 0; attempt < 5; attempt++) {
    const employeeId = await generateEmployeeId(session.company_id);
    try {
      [result] = await pool.query(
        `INSERT INTO users (company_id, employee_id, name, email, phone, password_hash, role_id, branch_id, department_id, designation_id, employee_type_id, reporting_manager_id, joining_date, must_change_password, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [session.company_id, employeeId, name, email.trim().toLowerCase(), phone || null, passwordHash, roleId, branchId || null, departmentId || null, designationId || null, employeeTypeId || null, reportingManagerId || null, joiningDate || null, createdBy, createdBy]
      );
      break;
    } catch (err) {
      if (err.code === "ER_DUP_ENTRY" && /'employee_id'/.test(err.sqlMessage || "") && attempt < 4) continue;
      throw err;
    }
  }
  await logActivity({ userId: createdBy, module: "users", action: "create", entityType: "user", entityId: result.insertId, description: `Created user ${name}`, companyId: session.company_id });

  // roleId is always the default/primary role — mirrored into user_roles
  // so the role switcher and role-management UI have something to show
  // from the moment the account exists. roleIds is an optional set of
  // additional roles a Super Admin grants at creation time (deduped
  // against roleId so it's never inserted twice).
  const extraRoleIds = Array.isArray(roleIds) ? roleIds.filter((r) => Number(r) !== Number(roleId)) : [];
  await pool.query(`INSERT INTO user_roles (user_id, role_id, is_default, created_by) VALUES (?, ?, 1, ?)`, [result.insertId, roleId, createdBy]);
  for (const extraId of extraRoleIds) {
    await pool.query(`INSERT IGNORE INTO user_roles (user_id, role_id, is_default, created_by) VALUES (?, ?, 0, ?)`, [result.insertId, extraId, createdBy]);
  }

  if (sendWelcome) {
    const [[role]] = await pool.query(`SELECT name FROM roles WHERE id = ?`, [roleId]);
    sendWelcomeEmail({ to: email, userId: result.insertId, name, email, tempPassword, roleName: role?.name || "Employee", createdBy, companyId: session.company_id }).catch((e) => console.error("Welcome email failed:", e.message));
  }
  if (reportingManagerId && reportingManagerId !== createdBy) {
    await createNotification(session.company_id, reportingManagerId, {
      title: "New team member added",
      message: `${name} now reports to you`,
      type: "user_created",
      link: `/workspace/users/${result.insertId}`,
    });
  }
  return getUserById(session, result.insertId);
}

export async function updateUser(session, id, data, updatedBy) {
  const { name, email, phone, roleId, status, branchId, departmentId, designationId, employeeTypeId, reportingManagerId, joiningDate } = data;
  await pool.query(
    `UPDATE users SET name=?, email=?, phone=?, role_id=?, status=?, branch_id=?, department_id=?, designation_id=?, employee_type_id=?, reporting_manager_id=?, joining_date=?, updated_by=?
     WHERE id=? AND company_id=? AND is_deleted=0`,
    [name, email.trim().toLowerCase(), phone || null, roleId, status, branchId || null, departmentId || null, designationId || null, employeeTypeId || null, reportingManagerId || null, joiningDate || null, updatedBy, id, session.company_id]
  );
  await logActivity({ userId: updatedBy, module: "users", action: "update", entityType: "user", entityId: id, description: `Updated user #${id}`, companyId: session.company_id });
  return getUserById(session, id);
}

export async function setUserStatus(session, id, status, updatedBy) {
  if (!VALID_STATUSES.has(status)) { const e = new Error("Invalid status."); e.status = 400; throw e; }
  await pool.query(`UPDATE users SET status=?, updated_by=? WHERE id=? AND company_id=? AND is_deleted=0`, [status, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "users", action: status, entityType: "user", entityId: id, description: `User #${id} set to ${status}`, companyId: session.company_id });
}

export async function resetUserPassword(session, id, newPassword, updatedBy) {
  const passwordHash = await hashPassword(newPassword);
  await pool.query(`UPDATE users SET password_hash=?, must_change_password=1, updated_by=? WHERE id=? AND company_id=? AND is_deleted=0`, [passwordHash, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "users", action: "reset_password", entityType: "user", entityId: id, description: `Password reset for #${id}`, companyId: session.company_id });
}

export async function deleteUser(session, id, deletedBy) {
  // FIX: previously called softDelete("users", id, deletedBy) with no
  // ownership check — every other mutating function in this file scopes
  // by session.company_id before writing; this one didn't, meaning a
  // stale/guessed id from another company could be soft-deleted. Added
  // the same ownership guard used elsewhere in this file.
  const [[user]] = await pool.query(
    `SELECT id FROM users WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`,
    [id, session.company_id]
  );
  if (!user) {
    const e = new Error("User not found in this company.");
    e.status = 404;
    throw e;
  }
  await softDelete("users", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "users", action: "delete", entityType: "user", entityId: id, description: `Deleted user #${id}`, companyId: session.company_id });
}

export async function restoreUser(session, id, updatedBy) {
  await pool.query(`UPDATE users SET is_deleted=0, deleted_at=NULL, status='active', updated_by=? WHERE id=? AND company_id=?`, [updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "users", action: "restore", entityType: "user", entityId: id, description: `Restored user #${id}`, companyId: session.company_id });
}

export async function bulkSetUserStatus(session, ids, status, updatedBy) {
  if (!ids.length) return;
  await pool.query(`UPDATE users SET status=?, updated_by=? WHERE id IN (?) AND company_id=? AND is_deleted=0 AND is_super_admin=0`, [status, updatedBy, ids, session.company_id]);
  await logActivity({ userId: updatedBy, module: "users", action: "bulk_status", entityType: "user", description: `Bulk status → ${status}`, meta: { ids }, companyId: session.company_id });
}

export async function bulkAssignRole(session, ids, roleId, updatedBy) {
  if (!ids.length) return;
  // FIX: roleId is verified as belonging to this company before being
  // assigned — previously any roleId could be written regardless of which
  // company owned it. Strictly this tenant's own roles now (every company
  // already has its own cloned copy of every role — see provisioning.js —
  // so there's never a legitimate reason to assign one of the
  // company_id-IS-NULL templates those clones came from).
  const [[role]] = await pool.query(
    `SELECT id FROM roles WHERE id=? AND company_id=? AND is_deleted=0 LIMIT 1`,
    [roleId, session.company_id]
  );
  if (!role) {
    const e = new Error("Role not found in this company.");
    e.status = 404;
    throw e;
  }
  await pool.query(`UPDATE users SET role_id=?, updated_by=? WHERE id IN (?) AND company_id=? AND is_deleted=0 AND is_super_admin=0`, [roleId, updatedBy, ids, session.company_id]);
  await logActivity({ userId: updatedBy, module: "users", action: "bulk_role", entityType: "user", description: `Bulk role assign`, meta: { ids, roleId }, companyId: session.company_id });
}

export async function getUserLoginHistory(session, userId, limit = 20) {
  // FIX: previously filtered only by userId with no company check —
  // a caller could view another company's user's login history by id.
  // getUserById already enforces company_id, so verifying via it here
  // closes the gap without duplicating the JOIN logic.
  const user = await getUserById(session, userId);
  if (!user) {
    const e = new Error("User not found in this company.");
    e.status = 404;
    throw e;
  }
  const [rows] = await pool.query(`SELECT * FROM user_login_history WHERE user_id=? ORDER BY created_at DESC LIMIT ?`, [userId, limit]);
  return rows;
}