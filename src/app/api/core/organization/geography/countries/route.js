import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listCountries, createCountry } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  return ok({ countries: await listCountries() });
});
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name) return badRequest("Name required.");
  return created({ id: await createCountry(body, session.id, session.company_id) });
}));