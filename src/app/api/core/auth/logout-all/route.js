import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { logoutAllDevices } from "@/lib/actions/sessions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  await logoutAllDevices(session.id, session.jti, session.id);
  return ok();
}));