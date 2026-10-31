import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getLeadPipelineStages, addLeadPipelineStage } from "@/lib/modules/crm/actions/leadPipelineStages";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const stages = await getLeadPipelineStages(session);
  return ok({ stages });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  if (!session.is_child_company) return forbidden();
  const body = await request.json();
  if (!body?.name || !String(body.name).trim()) return badRequest("Stage name is required.");
  const id = await addLeadPipelineStage(session, body.name, session.id);
  return created({ id });
}));
