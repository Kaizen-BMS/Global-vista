import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { setPlanModules } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!Array.isArray(body.moduleIds)) return badRequest("moduleIds must be an array.");
  await setPlanModules(id, body.moduleIds, session.id);
  return ok();
}));
