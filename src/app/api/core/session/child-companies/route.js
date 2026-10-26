import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listChildCompanies } from "@/lib/actions/companySwitch";

// listChildCompanies itself returns [] for anyone who isn't a permanent
// Super Admin of a company with children — this route doesn't need its
// own extra gate beyond "is there a session at all," same as
// available-roles/route.js.
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok({ companies: await listChildCompanies(session) });
});
