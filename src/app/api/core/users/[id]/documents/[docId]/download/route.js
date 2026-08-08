import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { getEmployeeDocumentDownloadUrl } from "@/lib/actions/employeeDocuments";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  const isSelf = Number(id) === session?.id;
  if (!isSelf && !(await can(session, "users.view"))) return forbidden();

  const { docId } = await ctx.params;
  const result = await getEmployeeDocumentDownloadUrl(session, docId, id);
  if (!result) return notFound();
  return ok(result);
});
