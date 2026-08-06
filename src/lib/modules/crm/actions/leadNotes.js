import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function listLeadNotes(leadId, session) {
  const [rows] = await pool.query(
    `SELECT n.*, u.name AS author_name
     FROM lead_notes n
     LEFT JOIN users u ON u.id = n.created_by
     WHERE n.lead_id = ?
     ORDER BY n.is_pinned DESC, n.created_at DESC`,
    [leadId]
  );
  return rows;
}

export async function addLeadNote(leadId, { content, visibility = "public", isPinned = false }, createdBy) {
  const [result] = await pool.query(
    `INSERT INTO lead_notes (lead_id, content, visibility, is_pinned, created_by) VALUES (?, ?, ?, ?, ?)`,
    [leadId, content, visibility, isPinned ? 1 : 0, createdBy]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "note_add", entityType: "lead", entityId: leadId, description: "Added a note" });
  return result.insertId;
}