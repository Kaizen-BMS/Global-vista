import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { softDelete } from "@/lib/helpers/db";

export async function listAcademicSessions(session) {
  const [rows] = await pool.query(`SELECT * FROM academic_sessions WHERE is_deleted=0 AND company_id=? ORDER BY start_date DESC`, [session.company_id]);
  return rows;
}
export async function createAcademicSession(session, { name, startDate, endDate, isCurrent }, createdBy) {
  if (new Date(endDate) <= new Date(startDate)) { const e = new Error("End date must be after start date."); e.status = 400; throw e; }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isCurrent) await conn.query(`UPDATE academic_sessions SET is_current=0 WHERE company_id=?`, [session.company_id]);
    const [result] = await conn.query(`INSERT INTO academic_sessions (company_id, name, start_date, end_date, is_current, created_by, updated_by) VALUES (?,?,?,?,?,?,?)`, [session.company_id, name, startDate, endDate, isCurrent ? 1 : 0, createdBy, createdBy]);
    await conn.commit();
    await logActivity({ userId: createdBy, module: "settings", action: "create", entityType: "academic_session", entityId: result.insertId, description: `Created session ${name}`, companyId: session.company_id });
    return result.insertId;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}
export async function deleteAcademicSession(session, id, deletedBy) {
  await softDelete("academic_sessions", id, deletedBy);
  await logActivity({ userId: deletedBy, module: "settings", action: "delete", entityType: "academic_session", entityId: id, description: `Deleted session #${id}`, companyId: session.company_id });
}