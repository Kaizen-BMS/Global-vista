import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { getCompanyBranding, updateCompanyBranding } from "@/lib/actions/companyBranding";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  assertSuperAdmin(session);
  return ok({ branding: await getCompanyBranding(session) });
});

export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertSuperAdmin(session);
  await updateCompanyBranding(session, await request.json(), session.id);
  return ok();
}));
