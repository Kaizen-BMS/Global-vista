import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listPartnersForAdmin, createPartner } from "@/lib/platform/actions/partners";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const partners = await listPartnersForAdmin();
  return ok({ partners });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const data = await request.json();
  if (!data.name) return badRequest("Partner name is required.");
  if (!data.code) return badRequest("Referral/coupon code is required.");
  const result = await createPartner(session, data);
  return ok(result, 201);
}));
