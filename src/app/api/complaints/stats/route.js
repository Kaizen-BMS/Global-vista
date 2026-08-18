import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getComplaintStats } from "@/lib/actions/complaints";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  const stats = await getComplaintStats(session);
  return ok({ stats });
});
