import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listCities, createCity } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const stateId = searchParams.get("stateId");
  if (!stateId) return badRequest("stateId is required.");
  const cities = await listCities(stateId);
  return ok({ cities });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.stateId || !body.name) return badRequest("stateId and name are required.");
  const id = await createCity(body, session.id);
  return created({ id });
}));