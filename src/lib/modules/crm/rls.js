import "server-only";
import { isSuperAdmin, getRolePermissionSlugs } from "@/lib/helpers/permissions";

// Was a hardcoded list of counsellor role SLUGS — broke for any role a
// company created or renamed that wasn't one of those four literal
// strings (confirmed live: "Sales Manager" users in two real companies
// have the leads.view permission granted but, because their role slug
// isn't in a hardcoded list, fell through to the final `1=0` branch and
// saw zero leads — including leads assigned directly to them). Driving
// this off the actual leads.view permission grant instead means it works
// for every role, including ones created after this code was written.
export async function getVisibleLeadFilter(session) {
  if (isSuperAdmin(session) || session.role_slug === "admin" || session.role_slug === "management") {
    return { where: "l.company_id = ?", params: [session.company_id] };
  }

  const permSlugs = await getRolePermissionSlugs(session.role_id);
  if (permSlugs.includes("leads.view")) {
    // Leads they own, plus the unassigned pool so they have something to
    // claim — without this, a lead nobody has assigned yet (e.g. a fresh
    // public-form submission) would be invisible to everyone below
    // Admin/Management, with no way for anyone to ever find it.
    return { where: "l.company_id = ? AND (l.assigned_to = ? OR l.assigned_to IS NULL)", params: [session.company_id, session.id] };
  }

  return { where: "l.company_id = ? AND 1=0", params: [session.company_id] };
}

export function canViewAllRecords(session) {
  return isSuperAdmin(session) || ["admin", "management"].includes(session.role_slug);
}