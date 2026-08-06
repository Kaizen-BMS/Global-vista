import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete, NOT_DELETED } from "@/lib/helpers/db";

export async function listAcademicSessions() {
  const [rows] = await pool.query(
    `SELECT * FROM academic_sessions
     WHERE ${NOT_DELETED}
     ORDER BY start_date DESC`
  );

  return rows.map((row) => ({
    ...row,

    start_date: row.start_date
      ? row.start_date.toISOString().split("T")[0]
      : null,

    end_date: row.end_date
      ? row.end_date.toISOString().split("T")[0]
      : null,

    created_at: row.created_at
      ? row.created_at.toISOString()
      : null,

    updated_at: row.updated_at
      ? row.updated_at.toISOString()
      : null,

    deleted_at: row.deleted_at
      ? row.deleted_at.toISOString()
      : null,
  }));
}

export async function createAcademicSession({ name, startDate, endDate, isCurrent }, createdBy) {
  if (new Date(endDate) <= new Date(startDate)) {
    const err = new Error("End date must be after start date.");
    err.status = 400;
    throw err;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isCurrent) {
      await conn.query(`UPDATE academic_sessions SET is_current = 0`);
    }
    const [result] = await conn.query(
      `INSERT INTO academic_sessions (name, start_date, end_date, is_current, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, startDate, endDate, isCurrent ? 1 : 0, createdBy, createdBy]
    );
    await conn.commit();
    await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "academic_session", entityId: result.insertId, description: `Created academic session ${name}` });
    return result.insertId;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function deleteAcademicSession(id, deletedBy) {
  await softDelete("academic_sessions", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "academic_session", entityId: id, description: `Deleted academic session #${id}` });
}