import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { uploadFile, getFileUrl } from "@/lib/services/StorageService";
import { hasIdeasSchema } from "@/lib/db/schemaFlags";

export const IDEA_CATEGORIES = ["Process Improvement", "Product/Feature", "Cost Saving", "Culture", "Other"];
export const IDEA_STATUSES = ["Submitted", "Under Review", "Planned", "In Progress", "Implemented", "Rejected"];
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

function assertSchemaReady() {
  const e = new Error("The ideas feature isn't available yet — a pending database migration must be applied first.");
  e.status = 503;
  throw e;
}

/** An employee sees their own ideas plus every company-wide idea another
 * employee opted to share; a Super Admin sees every idea in the company
 * regardless of visibility, since they own evaluation. */
export async function listIdeas(session, { status = null, scope = "mine" } = {}) {
  if (!(await hasIdeasSchema())) return [];
  const admin = isSuperAdmin(session);
  const where = ["i.company_id = ?"];
  const params = [session.company_id];
  if (!admin) {
    if (scope === "company") where.push("(i.visibility = 'company' OR i.created_by = ?)");
    else where.push("i.created_by = ?");
    params.push(session.id);
  }
  if (status) { where.push("i.status = ?"); params.push(status); }

  const [rows] = await pool.query(
    `SELECT i.*, u.name AS created_by_name, a.name AS assigned_to_name
     FROM ideas i
     LEFT JOIN users u ON u.id = i.created_by
     LEFT JOIN users a ON a.id = i.assigned_to
     WHERE ${where.join(" AND ")}
     ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

export async function getIdeaStats(session) {
  if (!(await hasIdeasSchema())) return { total: 0, submitted: 0, underReview: 0, planned: 0, inProgress: 0, implemented: 0 };
  if (!isSuperAdmin(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total,
       SUM(status = 'Submitted') AS submitted,
       SUM(status = 'Under Review') AS underReview,
       SUM(status = 'Planned') AS planned,
       SUM(status = 'In Progress') AS inProgress,
       SUM(status = 'Implemented') AS implemented
     FROM ideas WHERE company_id = ?`,
    [session.company_id]
  );
  return {
    total: Number(row.total), submitted: Number(row.submitted || 0), underReview: Number(row.underReview || 0),
    planned: Number(row.planned || 0), inProgress: Number(row.inProgress || 0), implemented: Number(row.implemented || 0),
  };
}

async function assertVisible(session, id) {
  const [[idea]] = await pool.query(`SELECT * FROM ideas WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  if (!idea) { const e = new Error("Idea not found."); e.status = 404; throw e; }
  const admin = isSuperAdmin(session);
  if (!admin && idea.created_by !== session.id && idea.visibility !== "company") { const e = new Error("Forbidden"); e.status = 403; throw e; }
  return idea;
}

export async function getIdea(session, id) {
  if (!(await hasIdeasSchema())) assertSchemaReady();
  await assertVisible(session, id);

  const ideaResult = await pool.query(
    `SELECT i.*, u.name AS created_by_name, a.name AS assigned_to_name
     FROM ideas i
     LEFT JOIN users u ON u.id = i.created_by
     LEFT JOIN users a ON a.id = i.assigned_to
     WHERE i.id = ? AND i.company_id = ?`,
    [id, session.company_id]
  );
  const commentsResult = await pool.query(
    `SELECT ic.*, u.name AS author_name FROM idea_comments ic LEFT JOIN users u ON u.id = ic.author_id
     WHERE ic.idea_id = ? AND ic.company_id = ? ORDER BY ic.created_at ASC`,
    [id, session.company_id]
  );
  return { ...ideaResult[0][0], comments: commentsResult[0] };
}

export async function createIdea(session, data, createdBy) {
  if (!(await hasIdeasSchema())) assertSchemaReady();
  if (!data.title || !data.title.trim()) { const e = new Error("Title is required."); e.status = 400; throw e; }
  if (!data.description || !data.description.trim()) { const e = new Error("Description is required."); e.status = 400; throw e; }

  let attachmentKey = null, attachmentName = null;
  if (data.file) {
    if (data.file.size > MAX_ATTACHMENT_BYTES) { const e = new Error(`Attachment exceeds ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB limit.`); e.status = 400; throw e; }
    const buffer = Buffer.from(await data.file.arrayBuffer());
    const uploaded = await uploadFile({ companyId: session.company_id, category: "idea-attachments", buffer, fileName: data.file.name, mimeType: data.file.type, maxSizeBytes: MAX_ATTACHMENT_BYTES });
    attachmentKey = uploaded.key;
    attachmentName = data.file.name;
  }

  const visibility = data.visibility === "company" ? "company" : "private";
  const [result] = await pool.query(
    `INSERT INTO ideas (company_id, title, category, description, priority, visibility, attachment_key, attachment_name, created_by)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [session.company_id, data.title.trim(), data.category || "Other", data.description.trim(), data.priority || "Medium", visibility, attachmentKey, attachmentName, createdBy]
  );

  await logActivity({ userId: createdBy, module: "ideas", action: "idea_created", entityType: "idea", entityId: result.insertId, companyId: session.company_id, description: `Submitted idea "${data.title.trim()}"` });

  const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0`, [session.company_id]);
  for (const admin of admins) {
    await createNotification(session.company_id, admin.id, {
      title: "New idea submitted", message: `${session.name}: ${data.title.trim()}`, type: "idea_created", link: `/workspace/ideas/${result.insertId}`,
    });
  }
  return result.insertId;
}

/** Super Admin only — evaluation: status/priority/assignment/rejection reason. */
export async function updateIdeaStatus(session, id, { status, priority, assignedTo, rejectionReason }, actorId) {
  if (!(await hasIdeasSchema())) assertSchemaReady();
  if (!isSuperAdmin(session)) { const e = new Error("Forbidden"); e.status = 403; throw e; }
  const [[idea]] = await pool.query(`SELECT * FROM ideas WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  if (!idea) { const e = new Error("Idea not found."); e.status = 404; throw e; }
  if (status && !IDEA_STATUSES.includes(status)) { const e = new Error("Invalid status."); e.status = 400; throw e; }
  if (status === "Rejected" && !rejectionReason?.trim()) { const e = new Error("A rejection reason is required."); e.status = 400; throw e; }

  const sets = [];
  const params = [];
  if (status) { sets.push("status = ?"); params.push(status); }
  if (priority) { sets.push("priority = ?"); params.push(priority); }
  if (assignedTo !== undefined) { sets.push("assigned_to = ?"); params.push(assignedTo || null); }
  if (status === "Rejected") { sets.push("rejection_reason = ?"); params.push(rejectionReason.trim()); }
  if (!sets.length) return;

  await pool.query(`UPDATE ideas SET ${sets.join(", ")} WHERE id = ? AND company_id = ?`, [...params, id, session.company_id]);
  await logActivity({ userId: actorId, module: "ideas", action: "idea_status_changed", entityType: "idea", entityId: id, companyId: session.company_id, description: `Idea status set to "${status || idea.status}"` });

  if (status && status !== idea.status) {
    await createNotification(session.company_id, idea.created_by, {
      title: status === "Implemented" ? "Your idea was implemented!" : "Idea status updated",
      message: `"${idea.title}" is now ${status}`, type: "idea_status_changed", link: `/workspace/ideas/${id}`,
    });
  }
}

export async function addIdeaComment(session, id, comment, authorId) {
  if (!(await hasIdeasSchema())) assertSchemaReady();
  const idea = await assertVisible(session, id);
  if (!comment || !comment.trim()) { const e = new Error("Comment is required."); e.status = 400; throw e; }

  const [result] = await pool.query(
    `INSERT INTO idea_comments (idea_id, company_id, author_id, comment) VALUES (?,?,?,?)`,
    [id, session.company_id, authorId, comment.trim()]
  );
  await logActivity({ userId: authorId, module: "ideas", action: "idea_comment_added", entityType: "idea", entityId: id, companyId: session.company_id, description: `Commented on idea "${idea.title}"` });

  const admin = isSuperAdmin(session);
  if (admin && idea.created_by !== authorId) {
    await createNotification(session.company_id, idea.created_by, { title: "Reply to your idea", message: `"${idea.title}"`, type: "idea_reply", link: `/workspace/ideas/${id}` });
  } else if (!admin) {
    const [admins] = await pool.query(`SELECT id FROM users WHERE company_id=? AND is_super_admin=1 AND is_deleted=0 AND id != ?`, [session.company_id, authorId]);
    for (const a of admins) {
      await createNotification(session.company_id, a.id, { title: "Idea comment", message: `${session.name} commented on "${idea.title}"`, type: "idea_reply", link: `/workspace/ideas/${id}` });
    }
  }
  return result.insertId;
}

export async function getIdeaAttachmentUrl(session, id) {
  const idea = await assertVisible(session, id);
  if (!idea.attachment_key) { const e = new Error("No attachment on this idea."); e.status = 404; throw e; }
  return { url: await getFileUrl(idea.attachment_key), fileName: idea.attachment_name };
}
