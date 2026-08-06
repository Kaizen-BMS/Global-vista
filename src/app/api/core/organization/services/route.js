import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listServices, createService } from "@/lib/actions/leadMeta";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "services.manage"))) return forbidden();
  return ok({ services: await listServices(session) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "services.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name || !body.slug) return badRequest("Name and slug required.");
  return created({ id: await createService(session, { ...body, createdBy: session.id }) });
}));