import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin, isPlatformOperator } from "@/lib/helpers/permissions";
import { hasPlatformSupportSchema } from "@/lib/db/schemaFlags";

export const SUPPORT_TICKET_CATEGORIES = ["Billing", "Technical", "Feature Request", "Account", "Other"];
export const SUPPORT_TICKET_STATUSES = ["Open", "In Progress", "Waiting for Company", "Resolved", "Closed"];

function assertSchemaReady() {
  const e = new Error("Platform Support isn't available yet — a pending database migration must be applied first.");
  e.status = 503;
  throw e;
}

async function notifyPlatformOperators(payload) {
  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0`);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, payload).catch(() => {});
  }
}

async function notifyCompanySuperAdmins(companyId, payload, excludeUserId = null) {
  const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0 AND id != ?`, [companyId, excludeUserId || 0]);
  for (const admin of admins) {
    await createNotification(companyId, admin.id, payload).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Company side — only a Super Admin escalates on the company's behalf,
// same elevation as who can start the internal broadcast channel.
// ---------------------------------------------------------------------------

export async function createSupportTicket(session, data, createdBy) {
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  if (!isSuperAdmin(session)) { const e = new Error("Only a Company Super Admin can raise a ticket with the platform team."); e.status = 403; throw e; }
  if (!data.subject?.trim()) { const e = new Error("Subject is required."); e.status = 400; throw e; }
  if (!data.description?.trim()) { const e = new Error("Description is required."); e.status = 400; throw e; }

  const [result] = await pool.query(
    `INSERT INTO platform_support_tickets (company_id, subject, category, description, priority, created_by) VALUES (?,?,?,?,?,?)`,
    [session.company_id, data.subject.trim(), data.category || "Other", data.description.trim(), data.priority || "Medium", createdBy]
  );

  await logActivity({ userId: createdBy, module: "platform_support", action: "ticket_created", entityType: "platform_support_ticket", entityId: result.insertId, companyId: session.company_id, description: `Raised platform support ticket "${data.subject.trim()}"` });

  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id = ?`, [session.company_id]);
  await notifyPlatformOperators({
    title: "New support ticket", message: `${company?.name || "A company"} (${session.name}): ${data.subject.trim()}`,
    type: "support_ticket_created", link: `/platform/support/${result.insertId}`,
  });
  return result.insertId;
}

/** A company only ever sees its own tickets — this is the one place that
 * still enforces normal tenant scoping; the platform-side list below is the
 * deliberate exception. */
export async function listCompanyTickets(session) {
  if (!(await hasPlatformSupportSchema())) return [];
  const [rows] = await pool.query(
    `SELECT t.*, u.name AS created_by_name, op.name AS operator_name
     FROM platform_support_tickets t
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN users op ON op.id = t.assigned_operator_id
     WHERE t.company_id = ? ORDER BY t.created_at DESC`,
    [session.company_id]
  );
  return rows;
}

export async function getCompanyTicket(session, id) {
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  const [[ticket]] = await pool.query(
    `SELECT t.*, u.name AS created_by_name, op.name AS operator_name
     FROM platform_support_tickets t
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN users op ON op.id = t.assigned_operator_id
     WHERE t.id = ? AND t.company_id = ?`,
    [id, session.company_id]
  );
  if (!ticket) { const e = new Error("Ticket not found."); e.status = 404; throw e; }
  const [comments] = await pool.query(
    `SELECT c.*, u.name AS author_name FROM platform_support_ticket_comments c LEFT JOIN users u ON u.id = c.author_id
     WHERE c.ticket_id = ? ORDER BY c.created_at ASC`,
    [id]
  );
  return { ...ticket, comments };
}

export async function addCompanyTicketComment(session, id, comment, authorId) {
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  if (!isSuperAdmin(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  if (!comment?.trim()) { const e = new Error("Comment is required."); e.status = 400; throw e; }
  const [[ticket]] = await pool.query(`SELECT id, subject, assigned_operator_id FROM platform_support_tickets WHERE id=? AND company_id=?`, [id, session.company_id]);
  if (!ticket) { const e = new Error("Ticket not found."); e.status = 404; throw e; }

  const [result] = await pool.query(`INSERT INTO platform_support_ticket_comments (ticket_id, author_id, is_operator, comment) VALUES (?,?,0,?)`, [id, authorId, comment.trim()]);
  await pool.query(`UPDATE platform_support_tickets SET updated_at = NOW() WHERE id = ?`, [id]);
  await logActivity({ userId: authorId, module: "platform_support", action: "ticket_comment_added", entityType: "platform_support_ticket", entityId: id, companyId: session.company_id, description: `Replied on ticket "${ticket.subject}"` });

  if (ticket.assigned_operator_id) {
    await createNotification(session.company_id, ticket.assigned_operator_id, { title: "New reply on support ticket", message: `${session.name}: "${ticket.subject}"`, type: "support_ticket_reply", link: `/platform/support/${id}` }).catch(() => {});
  } else {
    await notifyPlatformOperators({ title: "New reply on support ticket", message: `${session.name}: "${ticket.subject}"`, type: "support_ticket_reply", link: `/platform/support/${id}` });
  }
  return result.insertId;
}

// ---------------------------------------------------------------------------
// Platform side — the one deliberate cross-tenant read in the app. Every
// query below is intentionally NOT scoped by company_id, gated only by
// isPlatformOperator(session).
// ---------------------------------------------------------------------------

function assertOperator(session) {
  if (!isPlatformOperator(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
}

export async function listAllTickets(session, { status = null } = {}) {
  assertOperator(session);
  if (!(await hasPlatformSupportSchema())) return [];
  const where = [];
  const params = [];
  if (status) { where.push("t.status = ?"); params.push(status); }
  const [rows] = await pool.query(
    `SELECT t.*, c.name AS company_name, u.name AS created_by_name, op.name AS operator_name
     FROM platform_support_tickets t
     JOIN companies c ON c.id = t.company_id
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN users op ON op.id = t.assigned_operator_id
     ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY t.created_at DESC`,
    params
  );
  return rows;
}

export async function getSupportTicketStats(session) {
  assertOperator(session);
  if (!(await hasPlatformSupportSchema())) return { total: 0, open: 0, highPriority: 0, inProgress: 0, resolved: 0 };
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status='Open') AS open,
            SUM(priority IN ('High','Urgent') AND status NOT IN ('Resolved','Closed')) AS highPriority,
            SUM(status='In Progress') AS inProgress, SUM(status='Resolved') AS resolved
     FROM platform_support_tickets`
  );
  return {
    total: Number(row.total), open: Number(row.open || 0), highPriority: Number(row.highPriority || 0),
    inProgress: Number(row.inProgress || 0), resolved: Number(row.resolved || 0),
  };
}

export async function getTicketForOperator(session, id) {
  assertOperator(session);
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  const [[ticket]] = await pool.query(
    `SELECT t.*, c.name AS company_name, u.name AS created_by_name, u.email AS created_by_email, op.name AS operator_name
     FROM platform_support_tickets t
     JOIN companies c ON c.id = t.company_id
     LEFT JOIN users u ON u.id = t.created_by
     LEFT JOIN users op ON op.id = t.assigned_operator_id
     WHERE t.id = ?`,
    [id]
  );
  if (!ticket) { const e = new Error("Ticket not found."); e.status = 404; throw e; }
  const [comments] = await pool.query(
    `SELECT c.*, u.name AS author_name FROM platform_support_ticket_comments c LEFT JOIN users u ON u.id = c.author_id
     WHERE c.ticket_id = ? ORDER BY c.created_at ASC`,
    [id]
  );
  return { ...ticket, comments };
}

export async function updateTicketStatus(session, id, { status, priority, assignToSelf }, actorId) {
  assertOperator(session);
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  const [[ticket]] = await pool.query(`SELECT * FROM platform_support_tickets WHERE id = ?`, [id]);
  if (!ticket) { const e = new Error("Ticket not found."); e.status = 404; throw e; }
  if (status && !SUPPORT_TICKET_STATUSES.includes(status)) { const e = new Error("Invalid status."); e.status = 400; throw e; }

  const sets = [];
  const params = [];
  if (status) { sets.push("status = ?"); params.push(status); if (["Resolved", "Closed"].includes(status)) sets.push("resolved_at = NOW()"); }
  if (priority) { sets.push("priority = ?"); params.push(priority); }
  if (assignToSelf) { sets.push("assigned_operator_id = ?"); params.push(actorId); }
  if (!sets.length) return;

  await pool.query(`UPDATE platform_support_tickets SET ${sets.join(", ")} WHERE id = ?`, [...params, id]);
  await logActivity({ userId: actorId, module: "platform_support", action: "ticket_status_changed", entityType: "platform_support_ticket", entityId: id, companyId: ticket.company_id, description: `Ticket status set to "${status || ticket.status}"` });

  if (status && status !== ticket.status) {
    await notifyCompanySuperAdmins(ticket.company_id, { title: "Support ticket updated", message: `"${ticket.subject}" is now ${status}`, type: "support_ticket_reply", link: `/workspace/platform-support/${id}` });
  }
}

export async function addOperatorComment(session, id, comment, authorId) {
  assertOperator(session);
  if (!(await hasPlatformSupportSchema())) assertSchemaReady();
  if (!comment?.trim()) { const e = new Error("Comment is required."); e.status = 400; throw e; }
  const [[ticket]] = await pool.query(`SELECT id, subject, company_id FROM platform_support_tickets WHERE id=?`, [id]);
  if (!ticket) { const e = new Error("Ticket not found."); e.status = 404; throw e; }

  const [result] = await pool.query(`INSERT INTO platform_support_ticket_comments (ticket_id, author_id, is_operator, comment) VALUES (?,?,1,?)`, [id, authorId, comment.trim()]);
  await pool.query(`UPDATE platform_support_tickets SET updated_at = NOW() WHERE id = ?`, [id]);
  await logActivity({ userId: authorId, module: "platform_support", action: "ticket_comment_added", entityType: "platform_support_ticket", entityId: id, companyId: ticket.company_id, description: `Platform team replied on ticket "${ticket.subject}"` });

  await notifyCompanySuperAdmins(ticket.company_id, { title: "Reply from platform support", message: `"${ticket.subject}"`, type: "support_ticket_reply", link: `/workspace/platform-support/${id}` });
  return result.insertId;
}
