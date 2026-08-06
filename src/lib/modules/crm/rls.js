import "server-only";
import { isSuperAdmin } from "@/lib/helpers/permissions";

const COUNSELLOR_ROLE_SLUGS = [
  "study-counsellor",
  "b2b-counsellor",
  "summer-school-counsellor",
  "cern-counsellor",
];

export function getVisibleLeadFilter(session) {
  if (isSuperAdmin(session)) {
    return { where: "1=1", params: [] };
  }

  if (COUNSELLOR_ROLE_SLUGS.includes(session.role_slug)) {
    return { where: "l.assigned_to = ?", params: [session.id] };
  }

  if (session.role_slug === "admin" || session.role_slug === "management") {
    return { where: "1=1", params: [] };
  }

  return { where: "1=0", params: [] };
}

export function canViewAllRecords(session) {
  return isSuperAdmin(session) || ["admin", "management"].includes(session.role_slug);
}