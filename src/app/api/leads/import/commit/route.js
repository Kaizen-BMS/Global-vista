import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { commitLeadImportChunk } from "@/lib/modules/crm/actions/leadImport";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();

  const body = await request.json();
  if (!Array.isArray(body.rows) || !body.rows.length) return badRequest("rows is required.");
  if (!["skip", "update", "import_anyway"].includes(body.duplicateStrategy)) return badRequest("Invalid duplicateStrategy.");

  const result = await commitLeadImportChunk(session, { rows: body.rows, duplicateStrategy: body.duplicateStrategy, importedBy: session.id });
  return ok(result);
}));
