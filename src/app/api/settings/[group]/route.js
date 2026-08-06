import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getSettingsByGroup, updateSettings } from "@/lib/actions/settings";
import { withCsrf } from "@/lib/helpers/withCsrf";

const ALLOWED_GROUPS = ["branding", "email", "notifications", "system"];

export const GET = withErrorHandling(async (request, context) => {
  const { group } = await context.params;
  const session = await getSession();
  assertSuperAdmin(session);
  if (!ALLOWED_GROUPS.includes(group)) return ok({ settings: {} });
  const settings = await getSettingsByGroup(session, group);
  return ok({ settings });
});

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { group } = await context.params;
  const session = await getSession();
  assertSuperAdmin(session);
  if (!ALLOWED_GROUPS.includes(group)) { const err = new Error("Unknown settings group."); err.status = 400; throw err; }
  const body = await request.json();
  await updateSettings(session, group, body, session.id);
  return ok();
}));