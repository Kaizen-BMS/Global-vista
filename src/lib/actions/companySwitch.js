import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { isSuperAdminAccount } from "@/lib/helpers/permissions";
import { provisionCompany } from "@/lib/platform/actions/provisioning";

/**
 * Parent company "switch into a child company" — only ever possible once
 * a Platform Operator has already linked a child via the Create Company
 * wizard (parent_company_id). Nothing here is self-service: a company
 * with no children, or a child company itself (grandchildren are
 * disallowed), simply gets an empty list / a 403 on every call below.
 *
 * Gated on the PERMANENT is_super_admin account flag (isSuperAdminAccount),
 * not the currently-active role — same precedent as the existing
 * available-roles/switchActiveRole code, so switching your own active
 * role away and back never locks you out of this feature either.
 */
export async function listChildCompanies(session) {
  if (!isSuperAdminAccount(session)) return [];
  const [rows] = await pool.query(
    `SELECT id, name, short_name, status FROM companies WHERE parent_company_id = ? AND status != 'deleted' ORDER BY name`,
    [session.company_id]
  );
  return rows;
}

// Re-validates everything server-side — the client's targetCompanyId is
// never trusted on its own, mirroring switchActiveRole's own discipline.
export async function switchIntoChildCompany(session, targetCompanyId) {
  if (!isSuperAdminAccount(session)) {
    const e = new Error("Only a Super Admin can switch into a child company.");
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
export async function provisionChildCompany(session, { companyName, shortName, adminName, adminEmail, adminPhone }) {
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
  return provisionCompany({ companyName, shortName, adminName, adminEmail, adminPhone, parentCompanyId: session.company_id }, session.id);
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
