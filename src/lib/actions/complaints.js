import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { uploadFile, getFileUrl } from "@/lib/services/StorageService";
import { hasComplaintsSchema } from "@/lib/db/schemaFlags";

export const COMPLAINT_CATEGORIES = ["Workplace", "Lead/Process", "Technical", "Policy", "Other"];
export const COMPLAINT_STATUSES = ["Open", "Under Review", "In Progress", "Waiting for Employee", "Resolved", "Closed"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function assertSchemaReady() {
  const e = new Error("The complaints feature isn't available yet — a pending database migration must be applied first.");
  e.status = 503;
  throw e;
}

/** Every employee sees their own complaints; a Super Admin sees every
 * complaint raised in the company. Never a cross-company query — always
 * scoped by session.company_id, and additionally by created_by unless the
 * caller is acting as Super Admin. */
export async function listComplaints(session, { status = null } = {}) {
  if (!(await hasComplaintsSchema())) return [];
  const admin = isSuperAdmin(session);
  const where = ["c.company_id = ?"];
  const params = [session.company_id];
  if (!admin) { where.push("c.created_by = ?"); params.push(session.id); }
  if (status) { where.push("c.status = ?"); params.push(status); }

  const [rows] = await pool.query(
    `SELECT c.*, u.name AS created_by_name, r.name AS related_employee_name, l.name AS related_lead_name, rv.name AS reviewer_name
     FROM complaints c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN users r ON r.id = c.related_employee_id
     LEFT JOIN leads l ON l.id = c.related_lead_id
     LEFT JOIN users rv ON rv.id = c.assigned_reviewer_id
     WHERE ${where.join(" AND ")}
     ORDER BY c.created_at DESC`,
    params
  );
  return rows;
}

export async function getComplaintStats(session) {
  if (!(await hasComplaintsSchema())) return { total: 0, open: 0, highPriority: 0, inProgress: 0, resolved: 0, overdue: 0 };
  if (!isSuperAdmin(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  const [[row]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'Open') AS open,
       SUM(priority IN ('High','Urgent') AND status NOT IN ('Resolved','Closed')) AS highPriority,
       SUM(status = 'In Progress') AS inProgress,
       SUM(status = 'Resolved') AS resolved,
       SUM(status NOT IN ('Resolved','Closed') AND created_at < DATE_SUB(NOW(), INTERVAL 3 DAY)) AS overdue
     FROM complaints WHERE company_id = ?`,
    [session.company_id]
  );
  return {
    total: Number(row.total), open: Number(row.open || 0), highPriority: Number(row.highPriority || 0),
    inProgress: Number(row.inProgress || 0), resolved: Number(row.resolved || 0), overdue: Number(row.overdue || 0),
  };
}

async function assertVisible(session, id) {
  const [[complaint]] = await pool.query(`SELECT * FROM complaints WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  if (!complaint) { const e = new Error("Complaint not found."); e.status = 404; throw e; }
  if (!isSuperAdmin(session) && complaint.created_by !== session.id) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return complaint;
}

export async function getComplaint(session, id) {
  if (!(await hasComplaintsSchema())) assertSchemaReady();
  await assertVisible(session, id);
  const admin = isSuperAdmin(session);

  const complaintResult = await pool.query(
    `SELECT c.*, u.name AS created_by_name, r.name AS related_employee_name, l.name AS related_lead_name, rv.name AS reviewer_name
     FROM complaints c
     LEFT JOIN users u ON u.id = c.created_by
     LEFT JOIN users r ON r.id = c.related_employee_id
     LEFT JOIN leads l ON l.id = c.related_lead_id
     LEFT JOIN users rv ON rv.id = c.assigned_reviewer_id
     WHERE c.id = ? AND c.company_id = ?`,
    [id, session.company_id]
  );
  const commentsResult = await pool.query(
    `SELECT cc.*, u.name AS author_name FROM complaint_comments cc LEFT JOIN users u ON u.id = cc.author_id
     WHERE cc.complaint_id = ? AND cc.company_id = ? ${admin ? "" : "AND cc.is_internal = 0"} ORDER BY cc.created_at ASC`,
    [id, session.company_id]
  );
  return { ...complaintResult[0][0], comments: commentsResult[0] };
}

export async function createComplaint(session, data, createdBy) {
  if (!(await hasComplaintsSchema())) assertSchemaReady();
  if (!data.subject || !data.subject.trim()) { const e = new Error("Subject is required."); e.status = 400; throw e; }
  if (!data.description || !data.description.trim()) { const e = new Error("Description is required."); e.status = 400; throw e; }

  // A related lead/employee ID must belong to this same company — the FK
  // constraints only guarantee the row exists SOMEWHERE, not that it's
  // within the caller's tenant, so cross-tenant references are checked
  // here explicitly rather than trusted from client input.
  let relatedLeadId = null;
  if (data.relatedLeadId) {
    const [[lead]] = await pool.query(`SELECT id FROM leads WHERE id = ? AND company_id = ?`, [data.relatedLeadId, session.company_id]);
    if (!lead) { const e = new Error("Related lead not found."); e.status = 400; throw e; }
    relatedLeadId = lead.id;
  }
  let relatedEmployeeId = null;
  if (data.relatedEmployeeId) {
    const [[employee]] = await pool.query(`SELECT id FROM users WHERE id = ? AND company_id = ?`, [data.relatedEmployeeId, session.company_id]);
    if (!employee) { const e = new Error("Related employee not found."); e.status = 400; throw e; }
    relatedEmployeeId = employee.id;
  }

  let attachmentKey = null, attachmentName = null;
  if (data.file) {
    if (data.file.size > MAX_ATTACHMENT_BYTES) { const e = new Error(`Attachment exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB limit.`); e.status = 400; throw e; }
    const buffer = Buffer.from(await data.file.arrayBuffer());
    const uploaded = await uploadFile({ companyId: session.company_id, category: "complaint-attachments", buffer, fileName: data.file.name, mimeType: data.file.type, maxSizeBytes: MAX_ATTACHMENT_BYTES });
    attachmentKey = uploaded.key;
    attachmentName = data.file.name;
  }

  const [result] = await pool.query(
    `INSERT INTO complaints (company_id, subject, category, description, desired_resolution, priority, related_lead_id, related_employee_id, attachment_key, attachment_name, created_by)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [session.company_id, data.subject.trim(), data.category || "Other", data.description.trim(), data.desiredResolution || null, data.priority || "Medium", relatedLeadId, relatedEmployeeId, attachmentKey, attachmentName, createdBy]
  );

  await logActivity({ userId: createdBy, module: "complaints", action: "complaint_created", entityType: "complaint", entityId: result.insertId, companyId: session.company_id, description: `Raised complaint "${data.subject.trim()}"` });

  const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [session.company_id]);
  for (const admin of admins) {
    await createNotification(session.company_id, admin.id, {
      title: "New complaint raised", message: `${session.name}: ${data.subject.trim()}`, type: "complaint_created", link: `/workspace/complaints/${result.insertId}`,
    });
  }
  return result.insertId;
}

/** Super Admin only — status/priority/reviewer changes. */
export async function updateComplaintStatus(session, id, { status, priority, assignedReviewerId }, actorId) {
  if (!(await hasComplaintsSchema())) assertSchemaReady();
  if (!isSuperAdmin(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  const [[complaint]] = await pool.query(`SELECT * FROM complaints WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  if (!complaint) { const e = new Error("Complaint not found."); e.status = 404; throw e; }
  if (status && !COMPLAINT_STATUSES.includes(status)) { const e = new Error("Invalid status."); e.status = 400; throw e; }

  const sets = [];
  const params = [];
  if (status) { sets.push("status = ?"); params.push(status); if (["Resolved", "Closed"].includes(status)) { sets.push("resolved_at = NOW()"); } }
  if (priority) { sets.push("priority = ?"); params.push(priority); }
  if (assignedReviewerId !== undefined) { sets.push("assigned_reviewer_id = ?"); params.push(assignedReviewerId || null); }
  if (!sets.length) return;

  await pool.query(`UPDATE complaints SET ${sets.join(", ")} WHERE id = ? AND company_id = ?`, [...params, id, session.company_id]);
  await logActivity({ userId: actorId, module: "complaints", action: "complaint_status_changed", entityType: "complaint", entityId: id, companyId: session.company_id, description: `Complaint status set to "${status || complaint.status}"` });

  if (status && status !== complaint.status) {
    await createNotification(session.company_id, complaint.created_by, {
      title: "Complaint status updated", message: `"${complaint.subject}" is now ${status}`, type: "complaint_status_changed", link: `/workspace/complaints/${id}`,
    });
  }
}

export async function addComplaintComment(session, id, { comment, isInternal = false }, authorId) {
  if (!(await hasComplaintsSchema())) assertSchemaReady();
  const complaint = await assertVisible(session, id);
  if (!comment || !comment.trim()) { const e = new Error("Comment is required."); e.status = 400; throw e; }
  const admin = isSuperAdmin(session);
  const internal = admin && isInternal; // only a Super Admin may post an internal-only note

  const [result] = await pool.query(
    `INSERT INTO complaint_comments (complaint_id, company_id, author_id, comment, is_internal) VALUES (?,?,?,?,?)`,
    [id, session.company_id, authorId, comment.trim(), internal ? 1 : 0]
  );
  await logActivity({ userId: authorId, module: "complaints", action: "complaint_comment_added", entityType: "complaint", entityId: id, companyId: session.company_id, description: `Commented on complaint "${complaint.subject}"` });

  if (!internal) {
    const notifyId = admin ? complaint.created_by : (complaint.assigned_reviewer_id || null);
    if (notifyId && notifyId !== authorId) {
      await createNotification(session.company_id, notifyId, {
        title: admin ? "Reply to your complaint" : "New complaint reply", message: `"${complaint.subject}"`, type: "complaint_reply", link: `/workspace/complaints/${id}`,
      });
    }
    // Always also notify all Super Admins when an employee replies, so no
    // reply sits unseen just because a specific reviewer wasn't assigned.
    if (!admin) {
      const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0 AND id != ?`, [session.company_id, authorId]);
      for (const a of admins) {
        await createNotification(session.company_id, a.id, { title: "Complaint reply", message: `${session.name} replied to "${complaint.subject}"`, type: "complaint_reply", link: `/workspace/complaints/${id}` });
      }
    }
  }
  return result.insertId;
}

export async function getComplaintAttachmentUrl(session, id) {
  const complaint = await assertVisible(session, id);
  if (!complaint.attachment_key) { const e = new Error("No attachment on this complaint."); e.status = 404; throw e; }
  return { url: await getFileUrl(complaint.attachment_key), fileName: complaint.attachment_name };
}
