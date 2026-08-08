import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, notFound, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";
import { deleteEmployeeDocument } from "@/lib/actions/employeeDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const { id, docId } = await ctx.params;
  const session = await getSession();
  const isSelf = Number(id) === session?.id;
  const canManage = await can(session, "employee_documents.manage");
  if (!isSelf && !canManage) return forbidden();

  const [[doc]] = await pool.query(`SELECT status FROM employee_documents WHERE id=? AND user_id=? AND company_id=? AND is_deleted=0`, [docId, id, session.company_id]);
  if (!doc) return notFound();
  // Self-service delete is only for documents still in flux — an approved
  // compliance record shouldn't disappear at the employee's own click.
  if (isSelf && !canManage && !["Pending", "Rejected", "Re-upload Requested"].includes(doc.status)) {
    return forbidden("Only Super Admin can remove an approved document.");
  }

  await deleteEmployeeDocument(session, docId, id, session.id);
  return ok();
}));
