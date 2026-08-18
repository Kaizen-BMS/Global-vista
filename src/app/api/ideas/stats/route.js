import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getIdeaStats } from "@/lib/actions/ideas";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  const stats = await getIdeaStats(session);
  return ok({ stats });
});
