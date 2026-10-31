import "server-only";
import { can } from "@/lib/helpers/permissions";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import { ALL_NAV_ITEMS } from "@/lib/constants/navItems";
import { getCrmTerms } from "@/lib/helpers/crmTerms";

const QUERY_FORMS_HREF = "/workspace/lead-forms";
const LEADS_NAV_HREF = "/workspace/lead-management";
const REPORTS_HREF = "/workspace/reports";

export async function getVisibleNavItems(session) {
  const terms = getCrmTerms(session.is_child_company);
  const visible = [];
  for (const item of ALL_NAV_ITEMS) {
    if (item.permission && !(await can(session, item.permission))) continue;
    if (item.module && !(await isModuleEnabledForCompany(session.company_id, item.module))) continue;
    // "Query Forms" (embeddable web lead-capture forms) isn't relevant to
    // a school's counselling workflow — hidden entirely for sub-companies.
    if (item.href === QUERY_FORMS_HREF && session.is_child_company) continue;
    // Reports is sales-CRM reporting (lead conversion, revenue, etc.) — not
    // relevant to a school's counselling workflow.
    if (item.href === REPORTS_HREF && session.is_child_company) continue;
    // Relabel the Leads nav entry itself for a sub-company, same source
    // every other Lead→Student surface uses.
    if (item.href === LEADS_NAV_HREF && session.is_child_company) {
      visible.push({ ...item, label: terms.plural });
      continue;
    }
    visible.push(item);
  }
  return visible;
}
