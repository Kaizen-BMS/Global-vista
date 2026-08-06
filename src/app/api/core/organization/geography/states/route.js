import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listStates, createState } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const countryId = new URL(request.url).searchParams.get("countryId");
  if (!countryId) return badRequest("countryId required.");
  return ok({ states: await listStates(countryId) });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.countryId || !body.name) return badRequest("countryId and name required.");
  return created({ id: await createState(body, session.id, session.company_id) });
}));