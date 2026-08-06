import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeads, createLead } from "@/lib/actions/leads";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const sp = new URL(request.url).searchParams;
  return ok(await listLeads(session, { status: sp.get("status"), search: sp.get("search"), page: sp.get("page") || 1 }));
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.phone || !body.leadSourceId || !body.serviceId) return badRequest("Missing required fields.");
  return created({ id: await createLead(session, body, session.id) });
}));