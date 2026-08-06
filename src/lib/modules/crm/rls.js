import "server-only";
import { isSuperAdmin } from "@/lib/helpers/permissions";

const COUNSELLOR_ROLE_SLUGS = [
  "study-counsellor",
  "b2b-counsellor",
  "summer-school-counsellor",
  "cern-counsellor",
];

export function getVisibleLeadFilter(session) {
  if (isSuperAdmin(session) || session.role_slug === "admin" || session.role_slug === "management") {
    return { where: "l.company_id = ?", params: [session.company_id] };
  }

  if (COUNSELLOR_ROLE_SLUGS.includes(session.role_slug)) {
    return { where: "l.company_id = ? AND l.assigned_to = ?", params: [session.company_id, session.id] };
  }

  return { where: "l.company_id = ? AND 1=0", params: [session.company_id] };
}

export function canViewAllRecords(session) {
  return isSuperAdmin(session) || ["admin", "management"].includes(session.role_slug);
}