import { getSession } from "@/lib/auth";
import { ok, unauthorized, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getCompanyGstin, updateCompanyGstin } from "@/lib/platform/actions/subscriptionBilling";
import { isSuperAdmin } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

/** GET pre-fills the invoice screen's GSTIN field from whatever's already
 * on file; POST saves a new value. See updateCompanyGstin's own doc
 * comment for why an invalid/malformed value is still accepted. */
export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const gstin = await getCompanyGstin(session.company_id);
  return ok({ gstin });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!isSuperAdmin(session)) return forbidden();
  const { gstin } = await request.json();
  const result = await updateCompanyGstin(session, gstin || "");
  return ok(result);
}));
