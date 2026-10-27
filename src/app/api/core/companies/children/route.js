import { getSession } from "@/lib/auth";
import { ok, unauthorized, badRequest, created, withErrorHandling } from "@/lib/helpers/response";
import { listChildCompanies, provisionChildCompany } from "@/lib/actions/companySwitch";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  return ok({ companies: await listChildCompanies(session) });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();
  if (!body.companyName || !body.adminName || !body.adminEmail) {
    return badRequest("companyName, adminName, and adminEmail are required.");
  }
  // provisionChildCompany re-checks isSuperAdminAccount + can_create_child_companies
  // server-side, and forces parentCompanyId to this session's own company —
  // never trusts anything from the client beyond the new company's own details.
  const result = await provisionChildCompany(session, body);
  return created(result);
}));
