import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listOffersForAdmin, createOffer } from "@/lib/platform/actions/offers";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const offers = await listOffersForAdmin();
  return ok({ offers });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const data = await request.json();
  if (!data.text) return badRequest("Offer text is required.");
  const result = await createOffer(session, data);
  return ok(result, 201);
}));
