import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listAllLeadIds } from "@/lib/modules/crm/actions/leads";
import { listAllAggregatedLeadIds } from "@/lib/actions/companySwitch";

// Backs the Leads page's "Select all N matching your filters" — resolved
// fresh at the moment a bulk action actually runs (not cached from
// whatever the page last rendered), same filter params the main GET
// /api/leads list already accepts. GVE's combined view spans every
// school, not just session.company_id, so it gets its own resolver —
// using listAllLeadIds there would silently only ever match GVE's own
// Direct Leads.
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const customFieldFilters = Object.fromEntries(
    [...searchParams.entries()].filter(([k]) => k.startsWith("cf_")).map(([k, v]) => [k.slice(3), v])
  );
  const ids = session.can_create_child_companies
    ? await listAllAggregatedLeadIds(session, {
        schoolId: searchParams.get("school") || null, search: searchParams.get("q") || searchParams.get("search") || null,
        priority: searchParams.get("priority") || null, assignedTo: searchParams.get("assignedTo") || null,
        tag: searchParams.get("tag") || null, sourceName: searchParams.get("sourceId") || null, serviceName: searchParams.get("serviceId") || null,
        createdFrom: searchParams.get("createdFrom") || null, createdTo: searchParams.get("createdTo") || null,
      })
    : await listAllLeadIds(session, {
        status: searchParams.get("status") || null, stage: searchParams.get("stage") || null,
        priority: searchParams.get("priority") || null, sourceId: searchParams.get("sourceId") || null,
        serviceId: searchParams.get("serviceId") || null, search: searchParams.get("search") || null,
        assignedTo: searchParams.get("assignedTo") || null, country: searchParams.get("country") || null,
        tag: searchParams.get("tag") || null,
        createdFrom: searchParams.get("createdFrom") || null, createdTo: searchParams.get("createdTo") || null,
        followupFrom: searchParams.get("followupFrom") || null, followupTo: searchParams.get("followupTo") || null,
        customFieldFilters,
      });
  return ok({ ids });
});
