import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, notFound, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getCompanyDetail, updateCompanyBranding, setCompanyStatus, deleteCompany } from "@/lib/platform/actions/companies";
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

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  assertPlatformOperator(session);

  const company = await getCompanyDetail(id);
  if (!company) return notFound();

  // Client-side type-to-confirm is a UX safeguard, not a security
  // boundary — the server independently re-verifies the exact company
  // name was submitted before performing an irreversible, all-data
  // deletion, so a scripted/forged request can't skip the confirmation.
  const body = await request.json().catch(() => ({}));
  if (body.confirmName !== company.name) return badRequest("Confirmation text does not match the company name.");

  await deleteCompany(id, session.id);
  return ok();
}));