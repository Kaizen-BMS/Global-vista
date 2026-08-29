import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listAllTickets } from "@/lib/platform/actions/supportTickets";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || null;
  const tickets = await listAllTickets(session, { status });
  return ok({ tickets });
});
