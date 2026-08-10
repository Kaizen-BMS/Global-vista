import "server-only";
import { pool } from "@/lib/db";
import { isModuleEnabledForCompany, getSubscriptionState } from "@/lib/platform/tenant";

// Permanent account flag — a Company Super Admin always carries this,
// regardless of which role is currently active. Used ONLY where the
// permanent identity itself is what matters: authorizing a switch of
// your OWN active role to any role in the company. Never use this for a
// general permission bypass — that's what let a Super Admin who'd
// switched to "Counsellor" silently keep full Super Admin access the
// whole time, which is exactly the bug the active-role system exists to
// close.
export function isSuperAdminAccount(session) { return !!session?.is_super_admin; }

// "Acting as Super Admin right now" — the permanent flag AND the active
// role must agree. Every permission/visibility/RBAC check in the app
// should use this (it's what `can()`, RLS, and admin-only UI gates all
// call) — it correctly de-privileges the account the instant it switches
// to another role, and re-privileges it the instant it switches back.
export function isSuperAdmin(session) { return isSuperAdminAccount(session) && session?.role_slug === "super-admin"; }
export function isPlatformOperator(session) { return !!session?.is_platform_operator; }
export function isCompanySuspended(session) {
  return !isPlatformOperator(session) && ["suspended", "deleted"].includes(session?.company_status);
}

export async function getRolePermissionSlugs(roleId) {
  const [rows] = await pool.query(
    `SELECT p.slug FROM permissions p JOIN role_permissions rp ON rp.permission_id = p.id
     JOIN roles r ON r.id = rp.role_id WHERE rp.role_id = ? AND p.status = 'active' AND r.is_deleted = 0`, [roleId]
  );
  return rows.map((r) => r.slug);
}
async function getPermissionModuleSlug(slug) {
  const [[row]] = await pool.query(`SELECT module_slug FROM permissions WHERE slug = ? LIMIT 1`, [slug]);
  return row?.module_slug || "core";
}
export async function can(session, permissionSlug) {
  if (!session) return false;
  if (isCompanySuspended(session)) return false;
  const moduleSlug = await getPermissionModuleSlug(permissionSlug);
  const isPlatformSlug = moduleSlug === "platform";
  if (!isPlatformSlug && moduleSlug !== "core") {
    const state = await getSubscriptionState(session.company_id);
    if (["expired", "cancelled", "no_subscription"].includes(state) && permissionSlug.split(".").pop() !== "view") return false;
    if (!(await isModuleEnabledForCompany(session.company_id, moduleSlug))) return false;
  }
  if (isSuperAdmin(session)) return true;
  return (await getRolePermissionSlugs(session.role_id)).includes(permissionSlug);
}
export async function canAny(session, slugs = []) { for (const s of slugs) if (await can(session, s)) return true; return false; }
export async function canAll(session, slugs = []) { for (const s of slugs) if (!(await can(session, s))) return false; return true; }
export async function assertPermission(session, slug) { if (!(await can(session, slug))) { const e = new Error("Forbidden"); e.status = 403; throw e; } }
export function assertSuperAdmin(session) { if (!isSuperAdmin(session)) { const e = new Error("Forbidden — Super Admin only"); e.status = 403; throw e; } }
export function assertPlatformOperator(session) { if (!isPlatformOperator(session)) { const e = new Error("Forbidden — Platform Operator only"); e.status = 403; throw e; } }