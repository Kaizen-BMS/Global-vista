import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdminAccount, can } from "@/lib/helpers/permissions";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { paginate } from "@/lib/helpers/db";
import { claimLead, releaseLead, buildInlineCustomFieldSql, resolveSortColumn } from "@/lib/modules/crm/actions/leads";
import { listLeadCustomFields, saveLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadNoteTypeColumn } from "@/lib/db/schemaFlags";

// The permanent super-admin account can always switch (unchanged default);
// any other role can be granted the same ability via the "Switch to Child
// Company" (companies.switch) permission in Roles & Permissions.
async function canSwitchCompanies(session) {
  return isSuperAdminAccount(session) || (await can(session, "companies.switch"));
}

// Opening one lead from the combined Leads view (a "peek" — see
// openLeadAcrossCompanies/is_peeking) only needs to be able to see that
// combined view in the first place, not the full "switch into a whole
// child company" privilege that companies.switch grants — that stays a
// separate, higher-trust grant for a deliberate switch via UserMenu or
// Settings -> Schools.
async function canPeekIntoLead(session) {
  return !!session.can_create_child_companies && (await can(session, "leads.view"));
}
import { provisionCompany } from "@/lib/platform/actions/provisioning";

/**
 * Parent company "switch into a child company" — only ever possible once
 * a Platform Operator has already linked a child via the Create Company
 * wizard (parent_company_id). Nothing here is self-service: a company
 * with no children, or a child company itself (grandchildren are
 * disallowed), simply gets an empty list / a 403 on every call below.
 *
 * Gated on the PERMANENT is_super_admin account flag, OR the
 * "companies.switch" permission on whichever role is currently active —
 * so a regular employee can be granted this ability per-role via Roles &
 * Permissions, without needing the literal super-admin account flag.
 */
export async function listChildCompanies(session) {
  if (!(await canSwitchCompanies(session))) return [];
  return listChildCompaniesData(session.company_id);
}

async function listChildCompaniesData(companyId) {
  const [rows] = await pool.query(
    `SELECT id, name, short_name, status FROM companies WHERE parent_company_id = ? AND status != 'deleted' ORDER BY name`,
    [companyId]
  );
  return rows;
}

// Re-validates everything server-side — the client's targetCompanyId is
// never trusted on its own, mirroring switchActiveRole's own discipline.
// `isPeek` is just carried through to the caller (the API route hands it
// to reissueSessionWithCompany) — see that function's own comment for
// what it changes.
export async function switchIntoChildCompany(session, targetCompanyId, { isPeek = false } = {}) {
  const allowed = (await canSwitchCompanies(session)) || (isPeek && (await canPeekIntoLead(session)));
  if (!allowed) {
    const e = new Error("You don't have permission to switch into a child company.");
    e.status = 403;
    throw e;
  }
  // No multi-hop: you must be at home to switch into a child. Keeps the
  // identity model to exactly "home, or one child, with one way back" —
  // reissueSessionWithCompany also refuses to overwrite home_* once set,
  // so this check is a second, independent guard against the same thing.
  if (session.home_company_id) {
    const e = new Error("Already viewing a child company — exit first.");
    e.status = 403;
    throw e;
  }

  const [[child]] = await pool.query(
    `SELECT id, name FROM companies WHERE id = ? AND parent_company_id = ? AND status != 'deleted' LIMIT 1`,
    [targetCompanyId, session.company_id]
  );
  if (!child) {
    const e = new Error("That company is not one of your child companies.");
    e.status = 403;
    throw e;
  }

  const [[role]] = await pool.query(
    `SELECT id FROM roles WHERE company_id = ? AND slug = 'super-admin' AND is_deleted = 0 AND status = 'active' LIMIT 1`,
    [targetCompanyId]
  );
  if (!role) {
    const e = new Error("That company has no Super Admin role to switch into.");
    e.status = 500;
    throw e;
  }

  await logActivity({
    userId: session.id, module: "platform", action: "company_switch_in", entityType: "company", entityId: targetCompanyId,
    companyId: session.company_id, description: `${session.name} switched into child company "${child.name}"`,
  });

  return { companyId: child.id, roleId: role.id, roleSlug: "super-admin", isPeek };
}

export async function switchBackToHomeCompany(session) {
  if (!session.home_company_id) {
    const e = new Error("Not currently viewing a child company.");
    e.status = 400;
    throw e;
  }
  await logActivity({
    userId: session.id, module: "platform", action: "company_switch_out", entityType: "company", entityId: session.company_id,
    companyId: session.home_company_id, description: `${session.name} exited back to the home company`,
  });
  return { companyId: session.home_company_id, roleId: session.home_role_id, roleSlug: session.home_role_slug };
}

// Self-service version of the Platform Console's Create Company wizard,
// for a company the Platform Operator has explicitly granted
// can_create_child_companies to (see CanCreateChildrenToggle on the
// Platform Console's company detail page) — reuses the exact same
// provisionCompany() every company signup already goes through, just
// with parentCompanyId forced to this session's own company_id so a
// caller here can never create a child under any company but their own.
// provisionCompany's own validation already rejects a parent that is
// itself a child (no grandchildren), which also means this naturally
// stays disabled while a Super Admin is switched INTO a child session —
// can_create_child_companies is per-company and a freshly-created child
// never has it set.
export async function provisionChildCompany(session, { companyName, shortName, adminName, adminEmail, adminPhone, adminPassword }) {
  if (!isSuperAdminAccount(session)) {
    const e = new Error("Only a Super Admin can create a child company.");
    e.status = 403;
    throw e;
  }
  if (!session.can_create_child_companies) {
    const e = new Error("This company hasn't been granted the ability to create child companies.");
    e.status = 403;
    throw e;
  }
  return provisionCompany({ companyName, shortName, adminName, adminEmail, adminPhone, adminPassword: adminPassword || null, parentCompanyId: session.company_id }, session.id);
}

/**
 * The "mixed together" view — one combined read across every child
 * company's own leads/users, aggregated for the parent's own reporting,
 * alongside the existing per-company "switch into" view for drilling
 * into just one at a time. This is the first place in the app that
 * deliberately reads across more than one company_id at once — every
 * other query in this codebase scopes to exactly session.company_id for
 * complete tenant isolation, so this is scoped as narrowly as possible:
 * read-only, and only ever the IDs returned by listChildCompanies (which
 * itself only returns companies whose parent_company_id is THIS
 * session's own company_id) — never an arbitrary company_id list, and
 * never anything from a company that isn't actually this parent's own
 * child. Mirrors the same cross-company aggregation pattern already used
 * for the Platform Operator's own executive dashboard
 * (getPlatformDashboard in src/lib/platform/actions/dashboard.js), just
 * scoped to one parent's children instead of every company on the
 * platform.
 *
 * Deliberately totals the SCHOOLS' own leads/users, not GVE's own —
 * GVE itself is the holding company, not a school with its own leads to
 * roll up alongside them.
 */
export async function getSchoolsOverview(session) {
  // Not re-checked against isSuperAdminAccount here — callers gate that
  // themselves when it matters (Settings -> Schools, which can create/
  // switch, is still super-admin-only at the page level); the dashboard's
  // own "Total Schools" card calls this ungated, same as any other
  // company's own dashboard stats.
  if (!session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }

  const children = await listChildCompaniesData(session.company_id);
  if (children.length === 0) return { schools: [], totals: { leadCount: 0, userCount: 0 } };

  const childIds = children.map((c) => c.id);
  const [leadRows] = await pool.query(`SELECT company_id, COUNT(*) AS leadCount FROM leads WHERE company_id IN (?) AND is_deleted = 0 GROUP BY company_id`, [childIds]);
  const [userRows] = await pool.query(`SELECT company_id, COUNT(*) AS userCount FROM users WHERE company_id IN (?) AND is_deleted = 0 GROUP BY company_id`, [childIds]);
  const leadByCompany = new Map(leadRows.map((r) => [r.company_id, r.leadCount]));
  const userByCompany = new Map(userRows.map((r) => [r.company_id, r.userCount]));

  const schools = children.map((c) => ({ ...c, leadCount: leadByCompany.get(c.id) || 0, userCount: userByCompany.get(c.id) || 0 }));
  const totals = schools.reduce(
    (acc, s) => ({ leadCount: acc.leadCount + s.leadCount, userCount: acc.userCount + s.userCount }),
    { leadCount: 0, userCount: 0 }
  );
  return { schools, totals };
}

/** Shared by every getAggregated-prefixed function below — same gate,
 * same id list, as listAggregatedSchoolLeads/getSchoolsOverview. Not
 * gated on isSuperAdminAccount — callers are the Dashboard (ungated, same
 * as any other company's own dashboard stats) and the Leads page (already
 * gated on the "leads.view" permission before it ever calls this). */
async function aggregatedCompanyIds(session) {
  if (!session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }
  const children = await listChildCompaniesData(session.company_id);
  return [...children.map((c) => c.id), session.company_id];
}

/** Powers the Filters panel's Stream/Class/Predicted Grade/District/etc.
 * dropdowns on GVE's combined view. Every school is provisioned with the
 * identical Student Information field set (see provisioning.js), so
 * reading just ONE school's own definitions is representative for all of
 * them — the actual filtering (applyCustomFieldFilters-equivalent in
 * listAggregatedSchoolLeads) matches by field_key against whichever
 * school a given lead really belongs to, never this particular school's
 * row ids. Returns [] for a GVE account with no schools yet. */
export async function getAggregatedStudentInfoFields(session) {
  if (!session.can_create_child_companies) return [];
  const children = await listChildCompaniesData(session.company_id);
  if (!children.length) return [];
  return listLeadCustomFields({ company_id: children[0].id }, { activeOnly: true });
}

/** The aggregated-view counterpart to an inline custom-field-column save
 * (Predicted Grade, Previous Year Percentage, …) — resolves the LEAD's
 * OWN school's field by KEY (never GVE's own, which doesn't have one)
 * and writes under that school's own company_id, exactly as if that
 * school's own staff had set it. GVE never knows a specific school's
 * field id up front the way that school's own session already does. */
export async function updateCustomFieldValueAggregated(session, leadId, fieldKey, value, actorId) {
  const allowedIds = await aggregatedCompanyIds(session);
  const [[lead]] = await pool.query(`SELECT company_id FROM leads WHERE id = ? AND is_deleted = 0`, [leadId]);
  if (!lead || !allowedIds.includes(lead.company_id)) { const e = new Error("Not one of your schools."); e.status = 403; throw e; }
  const [[field]] = await pool.query(
    `SELECT id FROM lead_custom_fields WHERE company_id = ? AND field_key = ? AND is_deleted = 0 LIMIT 1`,
    [lead.company_id, fieldKey]
  );
  if (!field) { const e = new Error(`This field isn't set up for this school.`); e.status = 400; throw e; }
  await saveLeadCustomFieldValues({ ...session, company_id: lead.company_id }, leadId, { [field.id]: value }, actorId);
}

/**
 * Runs an existing single-company lead action (claimLead, releaseLead —
 * neither does anything but read `session.company_id`/`session.name`)
 * once per lead, with `session` faked to carry THAT LEAD's real owning
 * company_id instead of GVE's own, exactly as if a school's own employee
 * had performed it. Every id is checked against aggregatedCompanyIds
 * first (never a caller-supplied company list) and anything outside it
 * is reported as an error for that id rather than silently touched. Only
 * ever called with a single id (per-row Take Lead/Release) — the actual
 * BULK versions below (status/note) use a real batch query instead of
 * looping this per lead, since N leads here would mean N round trips.
 */
async function runPerLeadAggregated(session, ids, fn) {
  const allowedIds = await aggregatedCompanyIds(session);
  const uniqueIds = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!uniqueIds.length) return { okCount: 0, errors: [] };
  const [rows] = await pool.query(`SELECT id, company_id FROM leads WHERE id IN (?) AND is_deleted = 0`, [uniqueIds]);
  const byId = new Map(rows.map((r) => [r.id, r.company_id]));
  let okCount = 0;
  const errors = [];
  for (const id of uniqueIds) {
    const companyId = byId.get(id);
    if (!companyId || !allowedIds.includes(companyId)) { errors.push({ id, message: "Not one of your schools." }); continue; }
    try { await fn({ ...session, company_id: companyId }, id); okCount++; }
    catch (err) { errors.push({ id, message: err.message }); }
  }
  return { okCount, errors };
}

/** The aggregated-view counterpart to claimLead — "Take Lead" on a row
 * from GVE's combined Leads list, which usually belongs to a school, not
 * GVE itself. */
export async function claimLeadAggregated(session, id, userId) {
  const { okCount, errors } = await runPerLeadAggregated(session, [id], (scoped, leadId) => claimLead(scoped, leadId, userId));
  if (!okCount) { const e = new Error(errors[0]?.message || "Failed to claim this lead."); e.status = 409; throw e; }
}

/** The aggregated-view counterpart to releaseLead. */
export async function releaseLeadAggregated(session, id, userId, { force = false } = {}) {
  const { okCount, errors } = await runPerLeadAggregated(session, [id], (scoped, leadId) => releaseLead(scoped, leadId, userId, { force }));
  if (!okCount) { const e = new Error(errors[0]?.message || "Failed to release this lead."); e.status = 409; throw e; }
}

/** The aggregated-view counterpart to bulkUpdateStatus — Hold/Deny from
 * the combined Leads list's bulk toolbar, across however many schools
 * the selection actually spans. A real batch UPDATE (not a per-lead loop
 * through runPerLeadAggregated) — status is a plain column with nothing
 * else per-lead-specific to vary, so this is 2 queries total (1 UPDATE +
 * 1 logActivity) no matter how many leads are selected, same shape the
 * plain (non-aggregated) bulkUpdateStatus already uses. */
export async function bulkUpdateStatusAggregated(session, ids, status, actorId) {
  const allowedIds = await aggregatedCompanyIds(session);
  const uniqueIds = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!uniqueIds.length) return { errors: [] };
  const [result] = await pool.query(
    `UPDATE leads SET status = ?, updated_by = ? WHERE id IN (?) AND company_id IN (?) AND is_deleted = 0`,
    [status, actorId, uniqueIds, allowedIds]
  );
  await logActivity({
    userId: actorId, module: "leads", action: "bulk_status_change", entityType: "lead", companyId: session.company_id,
    description: `Bulk status update to ${status} for ${result.affectedRows} leads across schools`, meta: { ids: uniqueIds, status },
  });
  const skipped = uniqueIds.length - result.affectedRows;
  return { errors: skipped > 0 ? [{ message: `${skipped} lead(s) were outside your network.` }] : [] };
}

/** The aggregated-view counterpart to bulkAddLeadNote — one multi-row
 * INSERT instead of looping addLeadNote per id (each note still carries
 * its OWN lead's real company_id, resolved and validated the same way
 * runPerLeadAggregated does), so this is 3 queries total (validate,
 * insert, log) no matter how many leads are selected. */
export async function bulkAddLeadNoteAggregated(session, ids, content, actorId) {
  const trimmed = content?.trim();
  if (!trimmed) { const e = new Error("Note content is required."); e.status = 400; throw e; }
  const allowedIds = await aggregatedCompanyIds(session);
  const uniqueIds = [...new Set((ids || []).map(Number).filter(Boolean))];
  if (!uniqueIds.length) return { addedCount: 0, skippedCount: 0 };

  const [rows] = await pool.query(`SELECT id, company_id FROM leads WHERE id IN (?) AND is_deleted = 0`, [uniqueIds]);
  const validRows = rows.filter((r) => allowedIds.includes(r.company_id));
  if (!validRows.length) return { addedCount: 0, skippedCount: uniqueIds.length };

  const withType = await hasLeadNoteTypeColumn();
  const columns = withType
    ? ["company_id", "lead_id", "content", "visibility", "type", "is_pinned", "created_by"]
    : ["company_id", "lead_id", "content", "visibility", "is_pinned", "created_by"];
  const values = validRows.map((r) => (withType
    ? [r.company_id, r.id, trimmed, "public", "general", 0, actorId]
    : [r.company_id, r.id, trimmed, "public", 0, actorId]));

  await pool.query(`INSERT INTO lead_notes (${columns.join(", ")}) VALUES ?`, [values]);
  await logActivity({
    userId: actorId, module: "leads", action: "bulk_note_add", entityType: "lead", companyId: session.company_id,
    description: `Bulk note added to ${validRows.length} leads across schools`, meta: { ids: validRows.map((r) => r.id) },
  });
  return { addedCount: validRows.length, skippedCount: uniqueIds.length - validRows.length };
}

/** Mirrors getLeadDashboardStats's exact shape (src/lib/modules/crm/
 * actions/dashboard.js) — just `company_id IN (?)` instead of `= ?`, no
 * getVisibleLeadFilter (that's a single-company RLS primitive; GVE's own
 * view here is deliberately the "sees everything across its own schools"
 * one, same as every other getAggregated* function). */
export async function getAggregatedLeadDashboardStats(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return { totalLeads: 0, newLeads: 0, converted: 0, todaysFollowups: 0, myLeads: 0, unassignedLeads: 0, conversionRate: 0 };

  // Was 6 separate round trips — same collapse as getLeadDashboardStats
  // (see that function's own comment): every leads-table-only COUNT(*)
  // becomes one conditional-SUM query, todaysFollowups stays separate
  // since it alone joins lead_followups.
  const [[counts]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN l.status = 'New' THEN 1 ELSE 0 END), 0) AS newLeads,
       COALESCE(SUM(CASE WHEN l.status = 'Converted' THEN 1 ELSE 0 END), 0) AS converted,
       COALESCE(SUM(CASE WHEN l.assigned_to = ? THEN 1 ELSE 0 END), 0) AS myLeads,
       COALESCE(SUM(CASE WHEN l.assigned_to IS NULL THEN 1 ELSE 0 END), 0) AS unassignedLeads
     FROM leads l WHERE l.is_deleted=0 AND l.company_id IN (?)`,
    [session.id, ids]
  );
  const [[todaysFollowups]] = await pool.query(
    `SELECT COUNT(*) AS total FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.is_deleted=0
     WHERE l.company_id IN (?) AND DATE(f.scheduled_at) = CURDATE() AND f.status = 'Scheduled'`,
    [ids]
  );
  const conversionRate = counts.total > 0 ? Math.round((counts.converted / counts.total) * 1000) / 10 : 0;
  return {
    totalLeads: counts.total, newLeads: counts.newLeads, converted: counts.converted,
    todaysFollowups: todaysFollowups.total, myLeads: counts.myLeads, unassignedLeads: counts.unassignedLeads, conversionRate,
  };
}

/** Mirrors getLeadsBySource — grouped by NAME rather than lead_sources.id,
 * since each school has its own separate lead_sources rows; two schools'
 * same-named source (e.g. both have "Project UDAAN") rolls up into one
 * slice this way instead of appearing twice. */
export async function getAggregatedLeadsBySource(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT s.name AS source, COUNT(l.id) AS count
     FROM leads l JOIN lead_sources s ON s.id = l.lead_source_id
     WHERE l.is_deleted=0 AND l.company_id IN (?)
     GROUP BY s.name ORDER BY count DESC`,
    [ids]
  );
  return rows;
}

/** Same reasoning as getAggregatedLeadsBySource, for Service. */
export async function getAggregatedLeadsByService(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT sv.name AS service, COUNT(l.id) AS count
     FROM leads l JOIN services sv ON sv.id = l.service_id
     WHERE l.is_deleted=0 AND l.company_id IN (?)
     GROUP BY sv.name ORDER BY count DESC`,
    [ids]
  );
  return rows;
}

/** Mirrors listDistinctTags — same `IN (ids)` scoping every getAggregated-
 * prefixed function here uses, since leads.tags is free text with no
 * per-company collision concern (unlike source/service names above). */
export async function getAggregatedDistinctTags(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT DISTINCT tags FROM leads l WHERE l.company_id IN (?) AND l.is_deleted = 0 AND l.tags IS NOT NULL AND l.tags != ''`,
    [ids]
  );
  const set = new Set();
  for (const row of rows) {
    for (const t of (row.tags || "").split(",")) { const trimmed = t.trim(); if (trimmed) set.add(trimmed); }
  }
  return Array.from(set).sort();
}

/** Mirrors getLeadsByStage — `stage` is a plain string column on `leads`
 * itself (not a per-company lookup table), so no name-collision concern
 * like source/service above. */
export async function getAggregatedLeadsByStage(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return [];
  const [rows] = await pool.query(
    `SELECT l.stage, COUNT(*) AS count FROM leads l WHERE l.is_deleted=0 AND l.company_id IN (?) GROUP BY l.stage`,
    [ids]
  );
  return rows;
}

/**
 * The combined lead LIST across every school — what GVE's own
 * /workspace/lead-management page renders INSTEAD OF listLeads() when
 * `session.can_create_child_companies` (there's no separate "Leads
 * Overview" page anymore; this is just what "Leads" means for GVE).
 * Reuses the exact same gate, same `listChildCompanies` id source, and
 * the same "only ever the ids this parent's own children resolve to"
 * discipline as `getSchoolsOverview` above — never a caller-supplied
 * company_id list. GVE's OWN leads (company_id = session.company_id) are
 * folded into the same scope so a prospect that approaches GVE directly
 * — not through any school — still shows up here, labeled "Independent"
 * (school_name is null for those rows; the UI renders the badge).
 * `schoolId` narrows to one specific child company, or the sentinel
 * "independent" for just GVE's own rows; omitted/null means every school
 * + GVE's own, combined. This query itself never writes anything —
 * opening a specific lead switches the whole session into its owning
 * school first (see OpenLeadLink-style logic in LeadsTable.js), it isn't
 * a second read-only view bolted on top.
 */
export async function listAggregatedSchoolLeads(session, {
  schoolId = null, search = null, priority = null, assignedTo = null, tag = null,
  sourceName = null, serviceName = null, createdFrom = null, createdTo = null,
  customFieldFilters = null,
  sort = "created_at", dir = "DESC",
  page = 1, pageSize = 20,
} = {}) {
  // Not gated on isSuperAdminAccount — the Leads page (its only caller
  // besides the Dashboard's own ungated "Recent Leads" widget) already
  // requires "leads.view" before reaching here, same as every other role
  // that's allowed onto that page for a regular company.
  if (!session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }

  const children = await listChildCompaniesData(session.company_id);
  const childIds = children.map((c) => c.id);

  let ids;
  if (schoolId === "independent") ids = [session.company_id];
  else if (schoolId) {
    const requested = Number(schoolId);
    if (!childIds.includes(requested)) { const e = new Error("That company is not one of your schools."); e.status = 403; throw e; }
    ids = [requested];
  } else ids = [...childIds, session.company_id];

  if (ids.length === 0) return { leads: [], total: 0, page: 1, pageSize, schools: children };

  const where = [`l.company_id IN (?)`, `l.is_deleted = 0`];
  const params = [ids];
  // Below Super Admin/Admin/Management, the "mine + unassigned" rule
  // applies ONLY to GVE's own Direct Leads (l.company_id = GVE's own) —
  // those get worked/distributed among GVE's own employees exactly like
  // any other company's own Leads page restricts its employees. A
  // SCHOOL's leads are a different company's own staff's work entirely;
  // a GVE employee reviewing/overseeing a school needs to see ALL of
  // that school's leads regardless of who it's assigned to there, so
  // every row whose company_id isn't GVE's own stays fully visible.
  if (!canViewAllRecords(session)) {
    where.push(`(l.company_id != ? OR l.assigned_to = ? OR l.assigned_to IS NULL)`);
    params.push(session.company_id, session.id);
  }
  if (priority) { where.push("l.priority = ?"); params.push(priority); }
  // A specific named counsellor isn't offered here (unlike a single
  // company's own LeadFilters) — "assigned to" a user id only means
  // something within ONE company, and a school's own employees never
  // show up in GVE's own assignable-users list. "Me" / "Unassigned" are
  // the two sentinels that still mean the same thing across every school.
  if (assignedTo === "unassigned") where.push("l.assigned_to IS NULL");
  else if (assignedTo === "me") { where.push("l.assigned_to = ?"); params.push(session.id); }
  if (tag) { where.push("(l.tags = ? OR l.tags LIKE ? OR l.tags LIKE ? OR l.tags LIKE ?)"); params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`); }
  if (createdFrom) { where.push("l.created_at >= ?"); params.push(createdFrom); }
  if (createdTo) { where.push("l.created_at <= ?"); params.push(`${createdTo} 23:59:59`); }
  // Matched by NAME, not lead_sources.id/services.id — each school has its
  // own separate rows in those tables (same reasoning as
  // getAggregatedLeadsBySource/Service above), so an id only ever means
  // something within one company.
  if (sourceName) { where.push("s.name = ?"); params.push(sourceName); }
  if (serviceName) { where.push("sv.name = ?"); params.push(serviceName); }
  // { [field_key]: value } — Stream/Class/Predicted Grade/District/etc.
  // Each school keeps its own separate lead_custom_fields row (same
  // field_key, own id), but this EXISTS clause only ever needs field_key
  // + l.id, so it reaches whichever school a given row actually belongs
  // to without caring which row id that is. Same clause shape
  // applyCustomFieldFilters (leads.js) uses for a single company.
  if (customFieldFilters) {
    for (const [key, value] of Object.entries(customFieldFilters)) {
      if (!value) continue;
      where.push(`EXISTS (SELECT 1 FROM lead_custom_field_values v JOIN lead_custom_fields f ON f.id = v.custom_field_id WHERE v.lead_id = l.id AND f.field_key = ? AND v.value = ?)`);
      params.push(key, value);
    }
  }
  if (search) {
    // Matches the school's own name too (co.name, joined below) and the
    // lead number, not just name/phone/email — "search by anything" on
    // the combined view, same field set listLeads's own search already
    // covers plus school name.
    where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ? OR co.name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });

  // l.* (not a hand-picked field list) so this lines up with listLeads's
  // own row shape — LeadsTable.js renders whichever columns are present
  // regardless of which query produced them, and shouldn't need a second,
  // narrower set of column defs just because the rows came from here.
  // The source/service JOINs are INNER on purpose (every lead always has
  // both); companies is LEFT (a lead can't actually lack a company, but
  // LEFT costs nothing and avoids ever hiding a row over it) — all three
  // reused as-is in the COUNT query below so a sourceName/serviceName/
  // school-name search (which reference these aliases) works there too.
  // Predicted Grade / Previous Year Percentage (same buildInlineCustomFieldSql
  // helper listLeads uses) — each join resolves to WHICHEVER school a
  // given row belongs to via l.company_id, so it correctly serves every
  // school at once here instead of just one fixed company.
  const { joinSql: inlineJoin, selectSql: inlineSelect } = buildInlineCustomFieldSql();
  const fromSql = `FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     LEFT JOIN companies co ON co.id = l.company_id
     ${inlineJoin}`;
  // Same sortKey -> expression map listLeads uses (shared, see
  // resolveSortColumn's own comment), plus this view's own "school_name"
  // alias — inline custom fields are always safe to sort by here since
  // the join above is unconditional, unlike listLeads's schools-only one.
  const sortExpr = resolveSortColumn(sort, { extra: { school_name: "school_name" } });
  const sortDir = dir === "ASC" ? "ASC" : "DESC";
  const [rows] = await pool.query(
    `SELECT l.*, s.name AS source_name, sv.name AS service_name, u.name AS assigned_name, cu.name AS created_by_name,
            (CASE WHEN l.company_id = ? THEN NULL ELSE co.name END) AS school_name
            ${inlineSelect}
     ${fromSql}
     LEFT JOIN users u ON u.id = l.assigned_to
     LEFT JOIN users cu ON cu.id = l.created_by
     ${whereSql}
     ORDER BY ${sortExpr} ${sortDir}
     LIMIT ? OFFSET ?`,
    [session.company_id, ...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${fromSql} ${whereSql}`, params);

  return { leads: rows, total, page: p, pageSize: size, schools: children };
}

/** Every lead id matching the current filters across every school + GVE
 * itself, no pagination (capped at a safety ceiling) — backs the
 * combined Leads page's "Select all N matching" for GVE, same role
 * listAllLeadIds (leads.js) plays for a single company's own Leads page.
 * Without this, "select all matching" on the combined view would
 * silently resolve through the single-company id-list instead and only
 * ever find GVE's own Direct Leads. Mirrors listAggregatedSchoolLeads's
 * own filter-building exactly, just ids only, no row data/pagination. */
export async function listAllAggregatedLeadIds(session, {
  schoolId = null, search = null, priority = null, assignedTo = null, tag = null,
  sourceName = null, serviceName = null, createdFrom = null, createdTo = null,
  customFieldFilters = null,
} = {}) {
  if (!session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }
  const children = await listChildCompaniesData(session.company_id);
  const childIds = children.map((c) => c.id);

  let ids;
  if (schoolId === "independent") ids = [session.company_id];
  else if (schoolId) {
    const requested = Number(schoolId);
    if (!childIds.includes(requested)) { const e = new Error("That company is not one of your schools."); e.status = 403; throw e; }
    ids = [requested];
  } else ids = [...childIds, session.company_id];
  if (ids.length === 0) return [];

  const where = [`l.company_id IN (?)`, `l.is_deleted = 0`];
  const params = [ids];
  if (priority) { where.push("l.priority = ?"); params.push(priority); }
  if (assignedTo === "unassigned") where.push("l.assigned_to IS NULL");
  else if (assignedTo === "me") { where.push("l.assigned_to = ?"); params.push(session.id); }
  if (tag) { where.push("(l.tags = ? OR l.tags LIKE ? OR l.tags LIKE ? OR l.tags LIKE ?)"); params.push(tag, `${tag},%`, `%,${tag}`, `%,${tag},%`); }
  if (createdFrom) { where.push("l.created_at >= ?"); params.push(createdFrom); }
  if (createdTo) { where.push("l.created_at <= ?"); params.push(`${createdTo} 23:59:59`); }
  if (sourceName) { where.push("s.name = ?"); params.push(sourceName); }
  if (serviceName) { where.push("sv.name = ?"); params.push(serviceName); }
  if (customFieldFilters) {
    for (const [key, value] of Object.entries(customFieldFilters)) {
      if (!value) continue;
      where.push(`EXISTS (SELECT 1 FROM lead_custom_field_values v JOIN lead_custom_fields f ON f.id = v.custom_field_id WHERE v.lead_id = l.id AND f.field_key = ? AND v.value = ?)`);
      params.push(key, value);
    }
  }
  if (search) {
    where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ? OR co.name LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [rows] = await pool.query(
    `SELECT l.id FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id
     LEFT JOIN companies co ON co.id = l.company_id
     ${whereSql} LIMIT 10000`,
    params
  );
  return rows.map((r) => r.id);
}
