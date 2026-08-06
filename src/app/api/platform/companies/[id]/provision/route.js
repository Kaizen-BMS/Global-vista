import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, created, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { provisionCompany } from "@/lib/platform/actions/provisioning";
import { withCsrf } from "@/lib/helpers/withCsrf";

/**
 * Provisioning creates the company itself — there is no existing
 * companyId to route through. This endpoint is deliberately NOT nested
 * under /api/platform/companies/[id]/provision (a new company has no
 * id yet, which previously produced the meaningless and misleading
 * POST /api/platform/companies/0/provision). The route returns the
 * newly created companyId in its response body instead.
 */
export const POST = withCsrf(
  withErrorHandling(async (request) => {
    const session = await getSession();
    assertPlatformOperator(session);

    const body = await request.json();
    if (!body.companyName || !body.adminName || !body.adminEmail) {
      return badRequest("companyName, adminName, and adminEmail are required.");
    }

    const result = await provisionCompany(body, session.id);
    return created(result);
  })
);