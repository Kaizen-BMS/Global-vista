import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getSettingsByGroup, updateSettings } from "@/lib/actions/settings";
import { withCsrf } from "@/lib/helpers/withCsrf";

const ALLOWED = ["branding", "email", "notifications", "system", "payments"];
export const GET = withErrorHandling(async (request, ctx) => {
  const { group } = await ctx.params;
  const session = await getSession();
  assertSuperAdmin(session);
  if (!ALLOWED.includes(group)) return ok({ settings: {} });
  return ok({ settings: await getSettingsByGroup(session, group) });
});
export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { group } = await ctx.params;
  const session = await getSession();
  assertSuperAdmin(session);
  if (!ALLOWED.includes(group)) { const e = new Error("Unknown group."); e.status = 400; throw e; }
  await updateSettings(session, group, await request.json(), session.id);
  return ok();
}));