import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listStates, createState } from "@/lib/actions/geography";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const countryId = searchParams.get("countryId");
  if (!countryId) return badRequest("countryId is required.");
  const states = await listStates(countryId);
  return ok({ states });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "geography.manage"))) return forbidden();
  const body = await request.json();
  if (!body.countryId || !body.name) return badRequest("countryId and name are required.");
  const id = await createState(body, session.id);
  return created({ id });
}));