import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listMessageableUsers } from "@/lib/actions/messaging";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const users = await listMessageableUsers(session);
  return ok({ users });
});
