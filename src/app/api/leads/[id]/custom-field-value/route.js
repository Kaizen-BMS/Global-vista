import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { saveLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { updateCustomFieldValueAggregated } from "@/lib/actions/companySwitch";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

// A dedicated, narrow endpoint for a single inline-editable custom-field
// column on the Students list (Predicted Grade, Previous Year
// Percentage, …) — kept separate from the generic custom-field-values
// route (which schools' own Lead Detail/Bulk Edit already use unchanged,
// a whole {fieldId: value} map at once) so GVE's combined view, where
// `id` usually belongs to a school rather than GVE itself, can resolve
// the right company's own field by KEY instead of needing that school's
// specific field id up front.
export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const { id } = await ctx.params;
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const { fieldKey, fieldId, value } = await request.json();

  if (session.can_create_child_companies) {
    if (!fieldKey) return badRequest("fieldKey is required.");
    await updateCustomFieldValueAggregated(session, id, fieldKey, value ?? "", session.id);
    return ok();
  }
  if (!fieldId) return badRequest("fieldId is required.");
  await saveLeadCustomFieldValues(session, id, { [fieldId]: value ?? "" }, session.id, { context: "lead_form" });
  return ok();
}));
