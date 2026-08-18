import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getIdea } from "@/lib/actions/ideas";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  const idea = await getIdea(session, id);
  return ok({ idea });
});
