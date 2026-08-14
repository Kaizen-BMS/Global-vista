import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { searchMessages } from "@/lib/actions/messaging";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const q = new URL(request.url).searchParams.get("q") || "";
  const results = await searchMessages(session, q);
  return ok({ results });
});
