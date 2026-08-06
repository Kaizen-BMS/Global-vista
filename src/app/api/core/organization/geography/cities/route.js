import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listCities, createCity } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const stateId = new URL(request.url).searchParams.get("stateId");
  if (!stateId) return badRequest("stateId required.");
  return ok({ cities: await listCities(stateId) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.stateId || !body.name) return badRequest("stateId and name required.");
  return created({ id: await createCity(body, session.id, session.company_id) });
}));