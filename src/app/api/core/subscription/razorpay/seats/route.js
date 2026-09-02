import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateCompanySeatQuantity } from "@/lib/platform/actions/razorpayBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

/** Lets an existing per_user subscriber buy more (or fewer) seats without
 * changing plans — see updateCompanySeatQuantity's own doc comment. */
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { seatQuantity } = await request.json();
  if (!seatQuantity) return badRequest("seatQuantity is required.");

  const result = await updateCompanySeatQuantity(session, Number(seatQuantity));
  return ok(result);
}));
