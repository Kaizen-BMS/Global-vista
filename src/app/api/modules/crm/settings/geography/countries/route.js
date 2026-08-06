import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listCountries, createCountry } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const countries = await listCountries();
  return ok({ countries });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name) return badRequest("Name is required.");
  const id = await createCountry(body, session.id);
  return created({ id });
}));