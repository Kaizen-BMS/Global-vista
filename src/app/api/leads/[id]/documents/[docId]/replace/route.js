import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { replaceLeadDocument } from "@/lib/modules/crm/actions/leadDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id, docId } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "leads.documents.manage"))) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type");
  if (!file || typeof file === "string") return badRequest("No file provided.");
  if (!type) return badRequest("Document type is required.");

  const newId = await replaceLeadDocument(session, id, docId, { type, file }, session.id);
  return ok({ id: newId });
}));
