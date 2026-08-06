import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadNotes(session, leadId) {
  const [rows] = await pool.query(
    `SELECT n.*, u.name AS author_name
     FROM lead_notes n
     LEFT JOIN users u ON u.id = n.created_by
     WHERE n.lead_id = ? AND n.company_id = ?
     ORDER BY n.is_pinned DESC, n.created_at DESC`,
    [leadId, session.company_id]
  );
  return rows;
}

export async function addLeadNote(session, leadId, { content, visibility = "public", isPinned = false }, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_notes (company_id, lead_id, content, visibility, is_pinned, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [session.company_id, leadId, content, visibility, isPinned ? 1 : 0, createdBy]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "note_add", entityType: "lead", entityId: leadId, companyId: session.company_id, description: "Added a note" });
  return result.insertId;
}