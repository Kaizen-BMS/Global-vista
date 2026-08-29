import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getCompanyTicket } from "@/lib/platform/actions/supportTickets";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const ticket = await getCompanyTicket(session, id);
  return ok({ ticket });
});
