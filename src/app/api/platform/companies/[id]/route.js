import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getCompanyDetail, updateCompanyBranding, setCompanyStatus } from "@/lib/platform/actions/companies";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);
  const company = await getCompanyDetail(id);
  if (!company) return notFound();
  return ok({ company });
});
export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);
  const body = await request.json();
  if (body.status) await setCompanyStatus(id, body.status, session.id);
  if (body.branding) await updateCompanyBranding(id, body.branding, session.id);
  return ok();
}));