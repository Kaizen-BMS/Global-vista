import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateEmployeeDocumentType, deleteEmployeeDocumentType } from "@/lib/actions/employeeDocumentTypes";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name?.trim()) return badRequest("Name is required.");
  await updateEmployeeDocumentType(session, id, body, session.id);
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  await deleteEmployeeDocumentType(session, id, session.id);
  return ok();
}));
