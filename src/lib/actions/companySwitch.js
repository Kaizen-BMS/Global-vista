import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdminAccount, can } from "@/lib/helpers/permissions";
import { paginate } from "@/lib/helpers/db";

// The permanent super-admin account can always switch (unchanged default);
// any other role can be granted the same ability via the "Switch to Child
// Company" (companies.switch) permission in Roles & Permissions.
async function canSwitchCompanies(session) {
  return isSuperAdminAccount(session) || (await can(session, "companies.switch"));
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
  const [rows] = await pool.query(
    `SELECT id, name, short_name, status FROM companies WHERE parent_company_id = ? AND status != 'deleted' ORDER BY name`,
    [session.company_id]
  );
  return rows;
}

// Re-validates everything server-side — the client's targetCompanyId is
// never trusted on its own, mirroring switchActiveRole's own discipline.
export async function switchIntoChildCompany(session, targetCompanyId) {
  if (!(await canSwitchCompanies(session))) {
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

  return { companyId: child.id, roleId: role.id, roleSlug: "super-admin" };
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
  if (!isSuperAdminAccount(session) || !session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }

  const children = await listChildCompanies(session);
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

/**
 * The actual combined, filterable lead LIST (not just counts) across every
 * school — a GVE-only reporting view, read-only by design. Reuses the
 * exact same gate, same `listChildCompanies` id source, and the same
 * "only ever the ids this parent's own children resolve to" discipline as
 * `getSchoolsOverview` above — never a caller-supplied company_id list.
 * GVE's OWN leads (company_id = session.company_id) are folded into the
 * same scope so a prospect that approaches GVE directly — not through any
 * school — still shows up here, labeled "Independent" (school_name is
 * null for those rows; the UI renders the badge). `schoolId` narrows to
 * one specific child company, or the sentinel "independent" for just
 * GVE's own rows; omitted/null means every school + GVE's own, combined.
 * Editing a specific lead still happens inside its OWNER's own session
 * (see the "Switch to Company" flow) — this view never writes anything.
 */
export async function listAggregatedSchoolLeads(session, { schoolId = null, search = null, page = 1, pageSize = 20 } = {}) {
  if (!isSuperAdminAccount(session) || !session.can_create_child_companies) {
    const e = new Error("Not authorized.");
    e.status = 403;
    throw e;
  }

  const children = await listChildCompanies(session);
  const childIds = children.map((c) => c.id);

  let ids;
  if (schoolId === "independent") ids = [session.company_id];
  else if (schoolId) {
    const requested = Number(schoolId);
    if (!childIds.includes(requested)) { const e = new Error("That company is not one of your schools."); e.status = 403; throw e; }
    ids = [requested];
  } else ids = [...childIds, session.company_id];

  if (ids.length === 0) return { leads: [], total: 0, page: 1, pageSize };

  const where = [`l.company_id IN (?)`, `l.is_deleted = 0`];
  const params = [ids];
  if (search) {
    where.push(`(l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ?)`);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereSql = `WHERE ${where.join(" AND ")}`;
  const { limit, offset, page: p, pageSize: size } = paginate({ page, pageSize });

  const [rows] = await pool.query(
    `SELECT l.id, l.name, l.phone, l.email, l.stage, l.priority, l.created_at, l.company_id,
            (CASE WHEN l.company_id = ? THEN NULL ELSE co.name END) AS school_name
     FROM leads l
     LEFT JOIN companies co ON co.id = l.company_id
     ${whereSql}
     ORDER BY l.created_at DESC
     LIMIT ? OFFSET ?`,
    [session.company_id, ...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM leads l ${whereSql}`, params);

  return { leads: rows, total, page: p, pageSize: size, schools: children };
}
