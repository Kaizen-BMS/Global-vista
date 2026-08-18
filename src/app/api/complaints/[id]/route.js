import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getComplaint } from "@/lib/actions/complaints";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const complaint = await getComplaint(session, id);
  return ok({ complaint });
});
