import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { addLeadNote } from "@/lib/modules/crm/actions/leadNotes";
import { sendLeadBulkEmail } from "@/lib/helpers/email";

/**
 * Multi-select "email a group of selected students at once" — e.g. to
 * share a meeting link or a common update. Same id-validation shape as
 * bulkAddLeadNote (leadNotes.js): never trusts the client's id list alone.
 * A lead with no email on file is counted as skipped, not failed — it's
 * expected, not an error condition. Every successful send also gets a
 * short note on that lead, same audit-trail convention as every other
 * bulk action (bulkAddLeadNote, applyBulkPreviewUpdates, ...).
 */
export async function bulkSendLeadEmail(session, leadIds, { subject, message }, createdBy) {
  const ids = [...new Set((leadIds || []).map(Number).filter(Boolean))];
  if (ids.length === 0) { const e = new Error("No students were selected."); e.status = 400; throw e; }
  if (!subject?.trim()) { const e = new Error("Subject is required."); e.status = 400; throw e; }
  if (!message?.trim()) { const e = new Error("Message is required."); e.status = 400; throw e; }

  const [rows] = await pool.query(`SELECT id, name, email FROM leads WHERE id IN (?) AND company_id = ? AND is_deleted = 0`, [ids, session.company_id]);

  let sentCount = 0, failedCount = 0;
  const skippedCount = rows.filter((r) => !r.email).length;
  for (const lead of rows) {
    if (!lead.email) continue;
    const result = await sendLeadBulkEmail({ to: lead.email, subject, message, companyId: session.company_id, createdBy });
    if (result.success) {
      sentCount++;
      await addLeadNote(session, lead.id, { content: `Emailed: ${subject}`, type: "general" }, createdBy);
    } else {
      failedCount++;
    }
  }

  await logActivity({
    userId: createdBy, module: "leads", action: "bulk_email", entityType: "lead", entityId: null, companyId: session.company_id,
    description: `Sent bulk email "${subject}" to ${sentCount} student(s) (${skippedCount} skipped, ${failedCount} failed)`,
  });

  return { sentCount, skippedCount, failedCount };
}
