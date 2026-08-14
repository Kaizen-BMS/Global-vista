import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { uploadLeadDocument } from "@/lib/modules/crm/actions/leadDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "leads.documents.manage"))) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type");
  const documentTypeId = formData.get("documentTypeId") || null;
  if (!file || typeof file === "string") return badRequest("No file provided.");
  if (!type) return badRequest("Document type is required.");

  const docId = await uploadLeadDocument(session, id, { type, documentTypeId, file }, session.id);
  return created({ id: docId });
}));
