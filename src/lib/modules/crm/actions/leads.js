import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { NOT_DELETED, paginate } from "@/lib/helpers/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { generateLeadNumber } from "@/lib/modules/crm/leadNumber";

export async function listDistinctTags(session) {
  const { where, params } = getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT DISTINCT tags FROM leads l WHERE ${where} AND l.${NOT_DELETED} AND l.tags IS NOT NULL AND l.tags != ''`,
    params
  );
  const set = new Set();
  for (const row of rows) {
    for (const t of (row.tags || "").split(",")) { const trimmed = t.trim(); if (trimmed) set.add(trimmed); }
  }
  return Array.from(set).sort();
}

export async function findDuplicateLead(companyId, { phone, email }) {
  const [rows] = await pool.query(
    `SELECT id, name, phone, email, status FROM leads
     WHERE company_id = ? AND ${NOT_DELETED} AND (phone = ? ${email ? "OR email = ?" : ""})
     ORDER BY created_at DESC LIMIT 1`,
    email ? [companyId, phone, email] : [companyId, phone]
  );
  return rows[0] || null;
}

export async function listLeads(session, {
  status = null, stage = null, priority = null, sourceId = null, serviceId = null,
  assignedTo = null, country = null, search = null, tag = null,
  createdFrom = null, createdTo = null, followupFrom = null, followupTo = null,
  sort = "created_at", dir = "DESC",
  page = 1, pageSize = 20,
} = {}) {
  const { where: rlsWhere, params: rlsParams } = getVisibleLeadFilter(session);
  const where = [`l.${NOT_DELETED}`, rlsWhere];
  const params = [...rlsParams];

  if (status) { where.push("l.status = ?"); params.push(status); }
  if (stage) { where.push("l.stage = ?"); params.push(stage); }
  if (priority) { where.push("l.priority = ?"); params.push(priority); }
  if (sourceId) { where.push("l.lead_source_id = ?"); params.push(sourceId); }
  if (serviceId) { where.push("l.service_id = ?"); params.push(serviceId); }
  if (assignedTo) { where.push("l.assigned_to = ?"); params.push(assignedTo); }
  if (country) { where.push("l.country = ?"); params.push(country); }
  if (tag) { where.push("(l.tags = ? OR l.tags LIKE ? OR l.tags LIKE ? OR l.tags LIKE ?)"); params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`); }
  if (createdFrom) { where.push("l.created_at >= ?"); params.push(createdFrom); }
  if (createdTo) { where.push("l.created_at <= ?"); params.push(`${createdTo} 23:59:59`); }
  if (followupFrom) { where.push("l.next_follow_up >= ?"); params.push(followupFrom); }
  if (followupTo) { where.push("l.next_follow_up <= ?"); params.push(`${followupTo} 23:59:59`); }
  if (search) {
    where.push("(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });

  const SORTABLE = new Set(["created_at", "next_follow_up", "priority", "name", "stage"]);
  const sortCol = SORTABLE.has(sort) ? sort : "created_at";
  const sortDir = dir === "ASC" ? "ASC" : "DESC";

  const [rows] = await pool.query(
    `SELECT l.*, s.name AS source_name, sv.name AS service_name, u.name AS assigned_name
     FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     LEFT JOIN users u ON u.id = l.assigned_to
     ${whereSql}
     ORDER BY l.${sortCol} ${sortDir}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${whereSql}`, params);

  return { leads: rows, total, page: p, pageSize: size };
}

export async function listLeadsForExport(session, {
  status = null, stage = null, sourceId = null, serviceId = null, search = null,
  priority = null, assignedTo = null, country = null, tag = null,
  createdFrom = null, createdTo = null,
} = {}) {
  const { where: rlsWhere, params: rlsParams } = getVisibleLeadFilter(session);
  const where = [`l.${NOT_DELETED}`, rlsWhere];
  const params = [...rlsParams];
  if (status) { where.push("l.status = ?"); params.push(status); }
  if (stage) { where.push("l.stage = ?"); params.push(stage); }
  if (sourceId) { where.push("l.lead_source_id = ?"); params.push(sourceId); }
  if (serviceId) { where.push("l.service_id = ?"); params.push(serviceId); }
  if (priority) { where.push("l.priority = ?"); params.push(priority); }
  if (assignedTo) { where.push("l.assigned_to = ?"); params.push(assignedTo); }
  if (country) { where.push("l.country = ?"); params.push(country); }
  if (tag) { where.push("(l.tags = ? OR l.tags LIKE ? OR l.tags LIKE ? OR l.tags LIKE ?)"); params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`); }
  if (createdFrom) { where.push("l.created_at >= ?"); params.push(createdFrom); }
  if (createdTo) { where.push("l.created_at <= ?"); params.push(`${createdTo} 23:59:59`); }
  if (search) {
    where.push("(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [rows] = await pool.query(
    `SELECT l.*, s.name AS source_name, sv.name AS service_name, u.name AS assigned_name
     FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     LEFT JOIN users u ON u.id = l.assigned_to
     ${whereSql}
     ORDER BY l.created_at DESC LIMIT 5000`,
    params
  );
  return rows;
}

export async function listLeadsForKanban(session, { search = null, assignedTo = null, priority = null } = {}) {
  const { where: rlsWhere, params: rlsParams } = getVisibleLeadFilter(session);
  const where = [`l.${NOT_DELETED}`, rlsWhere, "l.stage NOT IN (?)"];
  const params = [...rlsParams, ["Lost", "Cancelled", "Duplicate"]];
  if (assignedTo) { where.push("l.assigned_to = ?"); params.push(assignedTo); }
  if (priority) { where.push("l.priority = ?"); params.push(priority); }
  if (search) {
    where.push("(l.name LIKE ? OR l.phone LIKE ? OR l.lead_number LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const [rows] = await pool.query(
    `SELECT l.id, l.lead_number, l.name, l.phone, l.stage, l.priority, l.tags, l.country, l.next_follow_up, l.updated_at,
            u.name AS assigned_name
     FROM leads l LEFT JOIN users u ON u.id = l.assigned_to
     ${whereSql} ORDER BY l.updated_at DESC LIMIT 500`,
    params
  );
  return rows;
}

export async function getLeadById(session, id) {
  const { where: rlsWhere, params: rlsParams } = getVisibleLeadFilter(session);
  const [rows] = await pool.query(
    `SELECT l.*, s.name AS source_name, sv.name AS service_name, u.name AS assigned_name,
            dup.name AS duplicate_of_name, dup.lead_number AS duplicate_of_number
     FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     LEFT JOIN users u ON u.id = l.assigned_to
     LEFT JOIN leads dup ON dup.id = l.duplicate_of
     WHERE l.id = ? AND l.${NOT_DELETED} AND ${rlsWhere}
     LIMIT 1`,
    [id, ...rlsParams]
  );
  return rows[0] || null;
}

export async function createLead(session, data, createdBy) {
  const duplicate = await findDuplicateLead(session.company_id, { phone: data.phone, email: data.email });
  const leadNumber = await generateLeadNumber();

  const [result] = await pool.query(
    `INSERT INTO leads (
      company_id, lead_number, name, email, phone, whatsapp, country, state, city, address, gender, dob,
      school, college, current_qualification, passing_year, percentage,
      english_test, ielts_score, pte_score,
      preferred_country, preferred_university, preferred_intake, budget, passport_status,
      lead_source_id, campaign, service_id, assigned_team, stage, priority, tags,
      status, is_duplicate, duplicate_of, remarks, notes, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.company_id, leadNumber, data.name, data.email || null, data.phone, data.whatsapp || null,
      data.country || null, data.state || null, data.city || null, data.address || null,
      data.gender || null, data.dob || null,
      data.school || null, data.college || null, data.currentQualification || null,
      data.passingYear || null, data.percentage || null,
      data.englishTest || null, data.ieltsScore || null, data.pteScore || null,
      data.preferredCountry || null, data.preferredUniversity || null, data.preferredIntake || null,
      data.budget || null, data.passportStatus || null,
      data.leadSourceId, data.campaign || null, data.serviceId, data.assignedTeam || null,
      "New Lead", data.priority || "Medium", data.tags || null,
      "New", duplicate ? 1 : 0, duplicate ? duplicate.id : null,
      data.remarks || null, data.notes || null, createdBy, createdBy,
    ]
  );

  await logActivity({
    userId: createdBy, module: "leads", action: "create", entityType: "lead",
    entityId: result.insertId, companyId: session.company_id,
    description: `Created lead ${data.name} (${leadNumber})${duplicate ? " — flagged duplicate" : ""}`,
  });

  const [[creator]] = await pool.query(`SELECT reporting_manager_id FROM users WHERE id = ?`, [createdBy]);
  if (creator?.reporting_manager_id) {
    await createNotification(session.company_id, creator.reporting_manager_id, {
      title: "New lead created",
      message: `${data.name} (${leadNumber})`,
      type: "lead_created",
      link: `/workspace/lead-management/${result.insertId}`,
    });
  }

  return result.insertId;
}

export async function updateLead(session, id, data, updatedBy) {
  const fieldMap = {
    name: "name", email: "email", phone: "phone", whatsapp: "whatsapp",
    country: "country", state: "state", city: "city", address: "address",
    gender: "gender", dob: "dob", school: "school", college: "college",
    currentQualification: "current_qualification", passingYear: "passing_year", percentage: "percentage",
    englishTest: "english_test", ieltsScore: "ielts_score", pteScore: "pte_score",
    preferredCountry: "preferred_country", preferredUniversity: "preferred_university",
    preferredIntake: "preferred_intake", budget: "budget", passportStatus: "passport_status",
    campaign: "campaign", assignedTeam: "assigned_team", priority: "priority", tags: "tags",
    remarks: "remarks", notes: "notes",
  };

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(fieldMap)) {
    if (data[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(data[key] === "" ? null : data[key]);
    }
  }
  if (sets.length === 0) return;

  sets.push("updated_by = ?");
  params.push(updatedBy, id, session.company_id);

  await pool.query(`UPDATE leads SET ${sets.join(", ")} WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`, params);

  await logActivity({
    userId: updatedBy, module: "leads", action: "update", entityType: "lead",
    entityId: id, companyId: session.company_id, description: `Updated lead #${id}`,
  });
}

export async function updateLeadStage(session, id, stage, updatedBy) {
  await pool.query(`UPDATE leads SET stage = ?, updated_by = ? WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`, [stage, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "leads", action: "stage_change", entityType: "lead", entityId: id, companyId: session.company_id, description: `Lead #${id} stage set to ${stage}` });
}

export async function updateLeadStatus(session, id, status, updatedBy) {
  const [[lead]] = await pool.query(`SELECT assigned_to, name FROM leads WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  await pool.query(`UPDATE leads SET status = ?, updated_by = ? WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`, [status, updatedBy, id, session.company_id]);
  await logActivity({ userId: updatedBy, module: "leads", action: "status_change", entityType: "lead", entityId: id, companyId: session.company_id, description: `Lead #${id} status set to ${status}` });
  if (lead?.assigned_to && lead.assigned_to !== updatedBy) {
    await createNotification(session.company_id, lead.assigned_to, {
      title: "Lead status updated",
      message: `${lead.name} is now ${status}`,
      type: "lead_status_changed",
      link: `/workspace/lead-management/${id}`,
    });
  }
}

/**
 * Merges `sourceId` into `targetId`: moves every note/task/followup/
 * document/assignment-history row over to the target lead, then marks
 * the source as a duplicate (status='Duplicate', soft-deleted) rather
 * than hard-deleting it, so the merge is auditable and reversible at
 * the DB level if ever needed. Runs in a single transaction — a
 * partial move (e.g. tasks moved but notes not) would corrupt history.
 */
export async function mergeLead(session, sourceId, targetId, actorId) {
  if (String(sourceId) === String(targetId)) {
    const e = new Error("Cannot merge a lead into itself."); e.status = 400; throw e;
  }
  const [[source]] = await pool.query(`SELECT id, name FROM leads WHERE id=? AND company_id=? AND ${NOT_DELETED}`, [sourceId, session.company_id]);
  const [[target]] = await pool.query(`SELECT id, name FROM leads WHERE id=? AND company_id=? AND ${NOT_DELETED}`, [targetId, session.company_id]);
  if (!source || !target) { const e = new Error("Lead not found in this company."); e.status = 404; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`UPDATE lead_notes SET lead_id=? WHERE lead_id=? AND company_id=?`, [targetId, sourceId, session.company_id]);
    await conn.query(`UPDATE lead_tasks SET lead_id=? WHERE lead_id=? AND company_id=?`, [targetId, sourceId, session.company_id]);
    await conn.query(`UPDATE lead_followups SET lead_id=? WHERE lead_id=? AND company_id=?`, [targetId, sourceId, session.company_id]);
    await conn.query(`UPDATE lead_documents SET lead_id=? WHERE lead_id=? AND company_id=?`, [targetId, sourceId, session.company_id]);
    await conn.query(`UPDATE lead_assignment_history SET lead_id=? WHERE lead_id=?`, [targetId, sourceId]);
    await conn.query(
      `UPDATE leads SET status='Duplicate', is_duplicate=1, duplicate_of=?, is_deleted=1, deleted_at=NOW(), deleted_by=?, updated_by=? WHERE id=? AND company_id=?`,
      [targetId, actorId, actorId, sourceId, session.company_id]
    );
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }

  await logActivity({
    userId: actorId, module: "leads", action: "merge", entityType: "lead", entityId: targetId,
    companyId: session.company_id, description: `Merged "${source.name}" (#${sourceId}) into "${target.name}" (#${targetId})`,
  });
}

export async function assignLead(session, id, assignedTo, assignedBy) {
  const [[current]] = await pool.query(`SELECT assigned_to, name, lead_number FROM leads WHERE id = ? AND company_id = ?`, [id, session.company_id]);
  await pool.query(`UPDATE leads SET assigned_to = ?, status = 'Assigned', updated_by = ? WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`, [assignedTo, assignedBy, id, session.company_id]);
  await pool.query(
    `INSERT INTO lead_assignment_history (lead_id, assigned_from, assigned_to, assigned_by) VALUES (?, ?, ?, ?)`,
    [id, current?.assigned_to || null, assignedTo, assignedBy]
  );
  await logActivity({ userId: assignedBy, module: "leads", action: "assign", entityType: "lead", entityId: id, companyId: session.company_id, description: `Lead #${id} assigned to user #${assignedTo}` });
  if (assignedTo !== current?.assigned_to) {
    await createNotification(session.company_id, assignedTo, {
      title: "Lead assigned to you",
      message: current ? `${current.name} (${current.lead_number})` : `Lead #${id}`,
      type: "lead_assigned",
      link: `/workspace/lead-management/${id}`,
    });
  }
}

export async function deleteLead(session, id, deletedBy) {
  await pool.query(`UPDATE leads SET is_deleted = 1, deleted_at = NOW(), deleted_by = ?, status = 'Cancelled' WHERE id = ? AND company_id = ?`, [deletedBy, id, session.company_id]);
  await logActivity({ userId: deletedBy, module: "leads", action: "delete", entityType: "lead", entityId: id, companyId: session.company_id, description: `Soft-deleted lead #${id}` });
}

export async function bulkUpdateStatus(session, ids, status, updatedBy) {
  if (!ids.length) return;
  await pool.query(
    `UPDATE leads SET status = ?, updated_by = ? WHERE id IN (?) AND company_id = ? AND ${NOT_DELETED}`,
    [status, updatedBy, ids, session.company_id]
  );
  await logActivity({ userId: updatedBy, module: "leads", action: "bulk_status_change", entityType: "lead", companyId: session.company_id, description: `Bulk status update to ${status} for ${ids.length} leads`, meta: { ids, status } });
}

export async function bulkAssign(session, ids, assignedTo, assignedBy) {
  if (!ids.length) return;
  await pool.query(
    `UPDATE leads SET assigned_to = ?, status = 'Assigned', updated_by = ? WHERE id IN (?) AND company_id = ? AND ${NOT_DELETED}`,
    [assignedTo, assignedBy, ids, session.company_id]
  );
  await logActivity({ userId: assignedBy, module: "leads", action: "bulk_assign", entityType: "lead", companyId: session.company_id, description: `Bulk assigned ${ids.length} leads to user #${assignedTo}`, meta: { ids, assignedTo } });
  await createNotification(session.company_id, assignedTo, {
    title: "Leads assigned to you",
    message: `${ids.length} lead${ids.length === 1 ? "" : "s"} assigned to you`,
    type: "lead_assigned",
    link: "/workspace/lead-management",
  });
}