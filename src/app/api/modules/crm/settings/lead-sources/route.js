import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadSources, createLeadSource } from "@/lib/actions/leadMeta";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "lead_sources.manage"))) return forbidden();
  const sources = await listLeadSources();
  return ok({ sources });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "lead_sources.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.slug) return badRequest("Name and slug are required.");
  const id = await createLeadSource({ ...body, createdBy: session.id });
  return created({ id });
}));