import "server-only";
import { pool } from "@/lib/db";

/**
 * The single chronological feed for a lead — backed entirely by
 * `activity_logs`, which every lead mutation already writes to (leads.js,
 * leadNotes.js, leadFollowups.js, leadMeetings.js, leadDocuments.js,
 * leadCustomFields.js, payments.js). Deliberately NOT a UNION of the
 * source tables — that would duplicate the audit trail this table already
 * is. Payment events are logged with `entity_type='payment_plan'` (a
 * different bounded context than the lead itself, matching how the
 * payments module keeps its own domain), so they're pulled in via a
 * second match against this lead's own payment_plans — no JOIN needed
 * since `entity_id` already IS the plan's id.
 */
export async function getLeadTimeline(session, leadId) {
  const [rows] = await pool.query(
    `SELECT al.*, u.name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     WHERE al.company_id = ? AND (
       (al.module = 'leads' AND al.entity_type = 'lead' AND al.entity_id = ?)
       OR (al.entity_type = 'payment_plan' AND al.entity_id IN (SELECT id FROM payment_plans WHERE lead_id = ? AND company_id = ?))
     )
     ORDER BY al.created_at DESC`,
    [session.company_id, leadId, leadId, session.company_id]
  );
  // `meta` is a MariaDB JSON-typed column — the driver already returns it
  // pre-parsed as an object (MariaDB reports it as "longtext" in
  // information_schema for MySQL-compatibility, which is misleading; the
  // wire protocol still flags it as JSON). Only parse it if it actually
  // came back as a string, so this stays correct regardless of driver/
  // column-type quirks on any environment this runs in.
  return rows.map((r) => ({ ...r, meta: typeof r.meta === "string" ? JSON.parse(r.meta) : r.meta }));
}
