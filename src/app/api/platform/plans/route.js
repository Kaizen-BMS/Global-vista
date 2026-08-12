import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, created, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listPlansForAdmin, createPlan } from "@/lib/platform/actions/subscriptions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const plans = await listPlansForAdmin();
  return ok({ plans });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (!body.name) return badRequest("Plan name is required.");
  const id = await createPlan(body);
  return created({ id });
}));
