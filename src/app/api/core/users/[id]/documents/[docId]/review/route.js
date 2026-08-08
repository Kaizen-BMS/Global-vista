import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { reviewEmployeeDocument } from "@/lib/actions/employeeDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const { docId } = await ctx.params;
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return forbidden();
  const { action, remarks } = await request.json();
  if (!["approve", "reject", "request_reupload"].includes(action)) return badRequest("Invalid action.");
  await reviewEmployeeDocument(session, docId, action, remarks, session.id);
  return ok();
}));
