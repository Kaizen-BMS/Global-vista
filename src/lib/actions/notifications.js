import "server-only";
import { pool } from "@/lib/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";

export async function getUserNotifications(session, { unreadOnly = false, limit = 20 } = {}) {
  const where = unreadOnly ? "AND is_read=0" : "";
  const [rows] = await pool.query(`SELECT * FROM notifications WHERE user_id=? AND company_id=? ${where} ORDER BY created_at DESC LIMIT ?`, [session.id, session.company_id, limit]);
  return rows;
}
const LEAD_NOTIFICATION_TYPES = ["lead_created", "lead_assigned", "lead_form_resubmission", "lead_released"];
const COMPLAINT_NOTIFICATION_TYPES = ["complaint_created", "complaint_status_changed", "complaint_reply"];
const IDEA_NOTIFICATION_TYPES = ["idea_created", "idea_status_changed", "idea_reply"];

/**
 * The ONE query set every sidebar dot is driven from — a single HTTP round
 * trip fans out to a handful of already-indexed, already-permission-scoped
 * queries instead of every nav item polling its own endpoint. Each count is
 * scoped exactly the way the underlying feature already scopes visibility
 * (notifications are only ever created for a user who was legitimately
 * authorized to see that record at creation time; the follow-ups count
 * reuses the same RLS filter `leads.view` gates everywhere else; messages
 * reuses the exact query getUnreadMessageCount uses — duplicated inline
 * rather than imported, since messaging.js's own notification creation
 * would otherwise form a circular import with this file).
 */
export async function getSidebarBadgeCounts(session) {
  const paymentsEnabled = await isModuleEnabledForCompany(session.company_id, "payments");
  const { where: leadWhere, params: leadParams } = await getVisibleLeadFilter(session);

  const [notifResult, followupResult, messageResult] = await Promise.all([
    pool.query(
      `SELECT COUNT(*) AS total, SUM(type IN (?)) AS leadCount, SUM(type = 'payment_received') AS paymentCount,
              SUM(type IN (?)) AS complaintCount, SUM(type IN (?)) AS ideaCount
       FROM notifications WHERE user_id=? AND company_id=? AND is_read=0`,
      [LEAD_NOTIFICATION_TYPES, COMPLAINT_NOTIFICATION_TYPES, IDEA_NOTIFICATION_TYPES, session.id, session.company_id]
    ),
    pool.query(
      `SELECT COUNT(*) AS n FROM lead_followups f
       JOIN leads l ON l.id = f.lead_id AND l.is_deleted = 0 AND ${leadWhere}
       WHERE f.status = 'Scheduled' AND f.scheduled_at <= NOW()`,
      leadParams
    ),
    pool.query(
      `SELECT COUNT(*) AS n FROM messages m
       JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
       WHERE m.company_id = ? AND m.sender_id != ? AND m.created_at > COALESCE(cp.last_read_at, '1970-01-01')`,
      [session.id, session.company_id, session.id]
    ),
  ]);
  const notifRow = notifResult[0][0];
  const followupRow = followupResult[0][0];
  const messageRow = messageResult[0][0];

  const complaints = Number(notifRow.complaintCount || 0);
  const ideas = Number(notifRow.ideaCount || 0);

  return {
    totalUnread: Number(notifRow.total),
    leads: Number(notifRow.leadCount || 0),
    followups: Number(followupRow.n),
    messages: Number(messageRow.n),
    payments: paymentsEnabled ? Number(notifRow.paymentCount || 0) : 0,
    complaints,
    ideas,
    // Complaints and Ideas now share a single "Support & Feedback" nav
    // entry (moved off the main sidebar into Settings) — one combined dot
    // for that entry, while the individual counts above stay available for
    // anything that still wants to distinguish them.
    support: complaints + ideas,
  };
}

export async function markAllNotificationsRead(session) {
  await pool.query(`UPDATE notifications SET is_read=1 WHERE user_id=? AND company_id=?`, [session.id, session.company_id]);
}
export async function markNotificationRead(session, id) {
  await pool.query(`UPDATE notifications SET is_read=1 WHERE id=? AND user_id=? AND company_id=?`, [id, session.id, session.company_id]);
}

/**
 * Creates a single in-app notification for one user. Silently no-ops
 * if userId is null/undefined (e.g. an unassigned lead/task) rather
 * than throwing — notification delivery should never fail the calling
 * business action.
 */
export async function createNotification(companyId, userId, { title, message = null, type = "info", link = null }) {
  if (!userId) return;
  await pool.query(
    `INSERT INTO notifications (company_id, user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?, ?)`,
    [companyId, userId, title, message, type, link]
  );
}