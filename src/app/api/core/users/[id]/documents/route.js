import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { listEmployeeDocuments, summarizeEmployeeDocuments } from "@/lib/actions/employeeDocuments";

export const GET = withErrorHandling(async (request, ctx) => {
  const { id } = await ctx.params;
  const session = await getSession();
  const isSelf = Number(id) === session?.id;
  if (!isSelf && !(await can(session, "users.view"))) return forbidden();
  const canManage = await can(session, "employee_documents.manage");

  let rows = await listEmployeeDocuments(session, id);
  if (isSelf && !canManage) {
    // Plain employees only ever see types explicitly marked employee-visible.
    rows = rows.filter((r) => r.type.employee_visible);
  }
  return ok({ documents: rows, summary: summarizeEmployeeDocuments(rows), canManage });
});
