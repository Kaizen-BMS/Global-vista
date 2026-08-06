import "server-only";
import { can } from "@/lib/helpers/permissions";
import { ALL_NAV_ITEMS } from "@/lib/constants/navItems";
export async function getVisibleNavItems(session) {
  const visible = [];
  for (const item of ALL_NAV_ITEMS) if (!item.permission || (await can(session, item.permission))) visible.push(item);
  return visible;
}