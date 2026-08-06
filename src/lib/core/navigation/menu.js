import "server-only";
import { can } from "@/lib/helpers/permissions";
import { ALL_NAV_ITEMS } from "@/lib/constants/navItems";

// Server-only. Resolves the permission-filtered menu for a session and
// returns plain serializable objects — safe to pass into a Client
// Component as props. Never import this file into a "use client" module;
// import "@/lib/constants/navItems" directly instead for icons/labels.
export async function getVisibleNavItems(session) {
  const visible = [];
  for (const item of ALL_NAV_ITEMS) {
    if (!item.permission || (await can(session, item.permission))) {
      visible.push(item);
    }
  }
  return visible;
}