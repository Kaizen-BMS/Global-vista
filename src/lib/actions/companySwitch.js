import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdminAccount, can } from "@/lib/helpers/permissions";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { paginate } from "@/lib/helpers/db";

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

/** Mirrors getLeadDashboardStats's exact shape (src/lib/modules/crm/
 * actions/dashboard.js) — just `company_id IN (?)` instead of `= ?`, no
 * getVisibleLeadFilter (that's a single-company RLS primitive; GVE's own
 * view here is deliberately the "sees everything across its own schools"
 * one, same as every other getAggregated* function). */
export async function getAggregatedLeadDashboardStats(session) {
  const ids = await aggregatedCompanyIds(session);
  if (!ids.length) return { totalLeads: 0, newLeads: 0, converted: 0, todaysFollowups: 0, myLeads: 0, unassignedLeads: 0, conversionRate: 0 };

  const [[leadCount]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.is_deleted=0 AND l.company_id IN (?)`, [ids]);
  const [[newLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.status='New' AND l.is_deleted=0 AND l.company_id IN (?)`, [ids]);
  const [[converted]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.status='Converted' AND l.is_deleted=0 AND l.company_id IN (?)`, [ids]);
  const [[todaysFollowups]] = await pool.query(
    `SELECT COUNT(*) AS total FROM lead_followups f JOIN leads l ON l.id = f.lead_id AND l.is_deleted=0
     WHERE l.company_id IN (?) AND DATE(f.scheduled_at) = CURDATE() AND f.status = 'Scheduled'`,
    [ids]
  );
  const [[myLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.is_deleted=0 AND l.company_id IN (?) AND l.assigned_to = ?`, [ids, session.id]);
  const [[unassignedLeads]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l WHERE l.is_deleted=0 AND l.company_id IN (?) AND l.assigned_to IS NULL`, [ids]);
  const conversionRate = leadCount.total > 0 ? Math.round((converted.total / leadCount.total) * 1000) / 10 : 0;
  return {
    totalLeads: leadCount.total, newLeads: newLeads.total, converted: converted.total,
    todaysFollowups: todaysFollowups.total, myLeads: myLeads.total, unassignedLeads: unassignedLeads.total, conversionRate,
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
  // Below Super Admin/Admin/Management, a GVE employee only sees leads
  // nobody's claimed yet plus whatever's assigned to them personally —
  // same "yours, or still up for grabs" rule as a regular company's own
  // Leads page (getVisibleLeadFilter), applied across every school's
  // leads here instead of just one company's own.
  if (!canViewAllRecords(session)) {
    where.push(`(l.assigned_to = ? OR l.assigned_to IS NULL)`);
    params.push(session.id);
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
  if (search) {
    where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });

  // l.* (not a hand-picked field list) so this lines up with listLeads's
  // own row shape — LeadsTable.js renders whichever columns are present
  // regardless of which query produced them, and shouldn't need a second,
  // narrower set of column defs just because the rows came from here.
  // The source/service JOINs are INNER on purpose (every lead always has
  // both) — reused as-is in the COUNT query below so a sourceName/
  // serviceName filter (which references those aliases) works there too.
  const fromSql = `FROM leads l
     JOIN lead_sources s ON s.id = l.lead_source_id
     JOIN services sv ON sv.id = l.service_id`;
  const [rows] = await pool.query(
    `SELECT l.*, s.name AS source_name, sv.name AS service_name, u.name AS assigned_name, cu.name AS created_by_name,
            (CASE WHEN l.company_id = ? THEN NULL ELSE co.name END) AS school_name
     ${fromSql}
     LEFT JOIN users u ON u.id = l.assigned_to
     LEFT JOIN users cu ON cu.id = l.created_by
     LEFT JOIN companies co ON co.id = l.company_id
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [session.company_id, ...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total ${fromSql} ${whereSql}`, params);

  return { leads: rows, total, page: p, pageSize: size, schools: children };
}
