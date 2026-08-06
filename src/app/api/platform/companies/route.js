import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { listCompanies, listAllModules, listPlans } from "@/lib/platform/actions/companies";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  return ok({ companies: await listCompanies(), modules: await listAllModules(), plans: await listPlans() });
});