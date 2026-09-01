import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getPartnerDetail } from "@/lib/platform/actions/partners";

export const GET = withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  const detail = await getPartnerDetail(session, id);
  return ok(detail);
});
