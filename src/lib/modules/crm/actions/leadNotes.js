import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { hasLeadNoteTypeColumn } from "@/lib/db/schemaFlags";

export async function listLeadNotes(session, leadId) {
  const [rows] = await pool.query(
    `SELECT n.*, u.name AS author_name
     FROM lead_notes n
     LEFT JOIN users u ON u.id = n.created_by
     WHERE n.lead_id = ? AND n.company_id = ?
     ORDER BY n.is_pinned DESC, n.created_at DESC`,
    [leadId, session.company_id]
  );
  // `type` only exists once the migration adding it has run (see
  // schemaFlags.js) — normalize to "general" on older rows/environments
  // rather than leaving it undefined, so the UI never has to special-case it.
  return rows.map((r) => ({ ...r, type: r.type || "general" }));
}

/** `type` is one of general/call/meeting/follow_up/internal — silently
 * dropped (falls back to the column default) if the migration adding the
 * column hasn't landed yet on this environment, never a hard failure. */
export async function addLeadNote(session, leadId, { content, visibility = "public", isPinned = false, type = "general" }, createdBy) {
  const withType = await hasLeadNoteTypeColumn();
  const [result] = await pool.query(
    withType
      ? `INSERT INTO lead_notes (company_id, lead_id, content, visibility, type, is_pinned, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`
      : `INSERT INTO lead_notes (company_id, lead_id, content, visibility, is_pinned, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    withType
      ? [session.company_id, leadId, content, visibility, type, isPinned ? 1 : 0, createdBy]
      : [session.company_id, leadId, content, visibility, isPinned ? 1 : 0, createdBy]
  );
  await logActivity({
    userId: createdBy, module: "leads", action: "note_add", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: "Added a note", meta: { noteId: result.insertId, type },
  });
  return result.insertId;
}
