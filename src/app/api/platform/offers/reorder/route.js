import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { reorderOffers } from "@/lib/platform/actions/offers";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const { orderedIds } = await request.json();
  if (!Array.isArray(orderedIds)) return badRequest("orderedIds must be an array.");
  await reorderOffers(session, orderedIds);
  return ok({ reordered: true });
}));
