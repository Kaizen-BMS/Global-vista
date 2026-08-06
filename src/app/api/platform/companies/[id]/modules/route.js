import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { setCompanyModule } from "@/lib/platform/actions/companies";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.moduleId || body.enabled === undefined) return badRequest("moduleId and enabled required.");
  await setCompanyModule(id, body.moduleId, body.enabled, session.id);
  return ok();
}));