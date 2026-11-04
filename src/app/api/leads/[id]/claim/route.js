import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { claimLead } from "@/lib/modules/crm/actions/leads";
import { claimLeadAggregated } from "@/lib/actions/companySwitch";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  // GVE's combined Leads view: `id` usually belongs to a school, not GVE
  // itself — claimLeadAggregated resolves and validates its real company
  // before claiming (and still handles GVE's own Direct Leads correctly).
  if (session.can_create_child_companies) {
    await claimLeadAggregated(session, id, session.id);
    return ok({});
  }
  const lead = await claimLead(session, id, session.id);
  return ok({ lead });
}));
