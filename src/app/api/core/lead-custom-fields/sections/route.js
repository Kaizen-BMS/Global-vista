import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { renameLeadCustomFieldSection, setLeadCustomFieldSectionStatus, reorderLeadCustomFieldSections } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

// A single endpoint for the three section-level operations — sections have
// no id of their own (they're a free-text column on each field row), so
// there's no natural /sections/[id] to split these across.
export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadCustomFieldsSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();

  if (body.action === "rename") {
    if (!body.oldSection || !body.newSection) return badRequest("oldSection and newSection are required.");
    await renameLeadCustomFieldSection(session, body.oldSection, body.newSection, session.id);
  } else if (body.action === "status") {
    if (!body.section || !["active", "inactive"].includes(body.status)) return badRequest("section and a valid status are required.");
    await setLeadCustomFieldSectionStatus(session, body.section, body.status, session.id);
  } else if (body.action === "reorder") {
    if (!Array.isArray(body.orderedSectionNames)) return badRequest("orderedSectionNames must be an array.");
    await reorderLeadCustomFieldSections(session, body.orderedSectionNames, session.id);
  } else {
    return badRequest("Unknown action.");
  }
  return ok();
}));
