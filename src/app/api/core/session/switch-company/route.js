import { getSession, reissueSessionWithCompany, reissueSessionExitingToHome } from "@/lib/auth";
import { ok, unauthorized, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { switchIntoChildCompany, switchBackToHomeCompany } from "@/lib/actions/companySwitch";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();
  if (!body.companyId) return badRequest("companyId is required.");
  // switchIntoChildCompany re-validates companyId against this session's
  // own parent_company_id relationship — the client's companyId is never
  // trusted on its own.
  const result = await switchIntoChildCompany(session, body.companyId);
  await reissueSessionWithCompany(session, result);
  return ok({ company: result });
}));

export const DELETE = withCsrf(withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const result = await switchBackToHomeCompany(session);
  await reissueSessionExitingToHome(session);
  return ok({ company: result });
}));
