import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { validate, leadValidators } from "@/lib/helpers/validation";
import { listLeads, createLead, bulkUpdateStatus, bulkAssign } from "@/lib/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const result = await listLeads(session, {
    status: searchParams.get("status") || null, stage: searchParams.get("stage") || null,
    priority: searchParams.get("priority") || null, sourceId: searchParams.get("sourceId") || null,
    serviceId: searchParams.get("serviceId") || null, search: searchParams.get("search") || null,
    sort: searchParams.get("sort") || "created_at", dir: searchParams.get("dir") || "DESC",
    page: searchParams.get("page") || 1, pageSize: searchParams.get("pageSize") || 20,
  });
  return ok(result);
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const body = await request.json();

  if (body.bulkAction) {
    if (!(await can(session, "leads.update"))) return forbidden();
    if (body.bulkAction === "status") await bulkUpdateStatus(session, body.ids || [], body.status, session.id);
    else if (body.bulkAction === "assign") {
      if (!(await can(session, "leads.assign"))) return forbidden();
      await bulkAssign(session, body.ids || [], body.assignedTo, session.id);
    }
    return ok();
  }

  if (!(await can(session, "leads.create"))) return forbidden();
  const { valid, errors } = validate(body, leadValidators);
  if (!valid) return badRequest("Validation failed.", { errors });
  const id = await createLead(session, body, session.id);
  return created({ id });
}));