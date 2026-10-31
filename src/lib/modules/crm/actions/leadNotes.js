import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { hasLeadNoteTypeColumn, hasLeadNoteEditColumns } from "@/lib/db/schemaFlags";

export async function listLeadNotes(session, leadId) {
  const withEdit = await hasLeadNoteEditColumns();
  const [rows] = await pool.query(
    `SELECT n.*, u.name AS author_name${withEdit ? ", eu.name AS editor_name" : ""}
     FROM lead_notes n
     LEFT JOIN users u ON u.id = n.created_by
     ${withEdit ? "LEFT JOIN users eu ON eu.id = n.updated_by" : ""}
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
 * column hasn't landed yet on this environment, never a hard failure.
 *
 * `createdAt` is optional, used only by the Excel import's "backdated
 * note" feature (a school's counsellor filling in an offline tracking
 * sheet, then importing it later with the note's real original date) —
 * omitted, this is byte-for-byte the same INSERT as before (the column's
 * own DEFAULT CURRENT_TIMESTAMP applies). Pass a JS Date (a UTC instant)
 * when provided, same as every other datetime param in this pool. */
export async function addLeadNote(session, leadId, { content, visibility = "public", isPinned = false, type = "general", createdAt = null }, createdBy) {
  const withType = await hasLeadNoteTypeColumn();
  const columns = ["company_id", "lead_id", "content", "visibility"];
  const values = [session.company_id, leadId, content, visibility];
  if (withType) { columns.push("type"); values.push(type); }
  columns.push("is_pinned"); values.push(isPinned ? 1 : 0);
  columns.push("created_by"); values.push(createdBy);
  if (createdAt) { columns.push("created_at"); values.push(createdAt); }

  const [result] = await pool.query(
    `INSERT INTO lead_notes (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`,
    values
  );
  await logActivity({
    userId: createdBy, module: "leads", action: "note_add", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: "Added a note", meta: { noteId: result.insertId, type },
  });
  return result.insertId;
}

/**
 * Multi-select "add counselling note to several students at once" — the
 * bulk-UI counterpart to the Excel-import note feature, for when you
 * don't want to prepare a whole file for a handful of selections.
 * Validates every id belongs to THIS company before writing anything
 * (never trusts the client's id list alone), then reuses addLeadNote()
 * per lead — no new side-effects to worry about, since addLeadNote
 * itself never notifies/emails anyone (unlike follow-ups).
 */
export async function bulkAddLeadNote(session, leadIds, { content }, createdBy) {
  const ids = [...new Set((leadIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) { const e = new Error("No students were selected."); e.status = 400; throw e; }
  if (!content?.trim()) { const e = new Error("Note content is required."); e.status = 400; throw e; }

  const [rows] = await pool.query(`SELECT id FROM leads WHERE id IN (?) AND company_id = ? AND is_deleted = 0`, [ids, session.company_id]);
  const validIds = new Set(rows.map((r) => r.id));

  let addedCount = 0;
  for (const id of ids) {
    if (!validIds.has(id)) continue;
    await addLeadNote(session, id, { content, type: "general" }, createdBy);
    addedCount++;
  }
  return { addedCount, skippedCount: ids.length - addedCount };
}

/** Edits an existing note's content/visibility/pin state. Whoever the
 * schema-flag says this environment supports gets `updated_by`/
 * `updated_at` stamped — the timeline note detail then shows "Edited by
 * <name> on <date>" from those two columns, and a matching `note_edit`
 * timeline entry is logged the same way `note_add` already is. */
export async function updateLeadNote(session, leadId, noteId, { content, visibility, isPinned }, updatedBy) {
  const [[existing]] = await pool.query(`SELECT id FROM lead_notes WHERE id = ? AND lead_id = ? AND company_id = ?`, [noteId, leadId, session.company_id]);
  if (!existing) { const e = new Error("Note not found."); e.status = 404; throw e; }

  const withEdit = await hasLeadNoteEditColumns();
  await pool.query(
    `UPDATE lead_notes SET content=?, visibility=?, is_pinned=?${withEdit ? ", updated_by=?, updated_at=NOW()" : ""} WHERE id=?`,
    withEdit ? [content, visibility, isPinned ? 1 : 0, updatedBy, noteId] : [content, visibility, isPinned ? 1 : 0, noteId]
  );
  await logActivity({
    userId: updatedBy, module: "leads", action: "note_edit", entityType: "lead", entityId: leadId, companyId: session.company_id,
    description: "Edited a note", meta: { noteId: Number(noteId) },
  });
}
