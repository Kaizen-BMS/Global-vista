import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listEmployeeDocuments, addEmployeeDocument, deleteEmployeeDocument } from "@/lib/actions/employeeDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "users.view"))) return forbidden();
  return ok({ documents: await listEmployeeDocuments(session, id) });
});
export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const body = await request.json();
  if (!body.type || !body.fileName || !body.fileUrl) return badRequest("type, fileName, fileUrl required.");
  return created({ id: await addEmployeeDocument(session, id, body, session.id) });
}));
export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const docId = new URL(request.url).searchParams.get("docId");
  await deleteEmployeeDocument(session, docId, id, session.id);
  return ok();
}));