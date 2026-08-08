import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listEmployeeDocumentTypes, createEmployeeDocumentType } from "@/lib/actions/employeeDocumentTypes";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  return ok({ types: await listEmployeeDocumentTypes(session) });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const body = await request.json();
  if (!body.name?.trim()) return badRequest("Name is required.");
  const id = await createEmployeeDocumentType(session, body, session.id);
  return created({ id });
}));
