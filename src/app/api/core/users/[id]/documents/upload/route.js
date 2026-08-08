import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { uploadEmployeeDocument } from "@/lib/actions/employeeDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  const isSelf = Number(id) === session?.id;
  if (!isSelf && !(await can(session, "employee_documents.manage"))) return forbidden();

  const formData = await request.formData();
  const file = formData.get("file");
  const documentTypeId = formData.get("documentTypeId");
  const expiryDate = formData.get("expiryDate") || null;
  if (!file || typeof file === "string") return badRequest("No file provided.");
  if (!documentTypeId) return badRequest("documentTypeId is required.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const docId = await uploadEmployeeDocument(session, id, documentTypeId, { buffer, fileName: file.name, mimeType: file.type, expiryDate }, session.id);
  return created({ id: docId });
}));
