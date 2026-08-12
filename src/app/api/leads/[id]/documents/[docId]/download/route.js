import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getLeadDocumentDownloadUrl } from "@/lib/modules/crm/actions/leadDocuments";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id, docId } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { url, fileName } = await getLeadDocumentDownloadUrl(session, id, docId);
  return ok({ url, fileName });
});
