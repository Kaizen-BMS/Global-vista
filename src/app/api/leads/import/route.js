import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { parseSpreadsheet } from "@/lib/core/actions/userImport";
import { validateLeadImportRows, autoMapColumns } from "@/lib/modules/crm/actions/leadImport";
import { withCsrf } from "@/lib/helpers/withCsrf";
import { assertImportExportAllowed } from "@/lib/platform/tenant";

// Mirrors the existing user-import endpoint's shape (stateless, file
// re-sent per call, action-switched) — parse and validate both need the
// uploaded file; commit (a separate, lighter route) doesn't, since it
// operates on rows this step already validated.
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return forbidden();
  await assertImportExportAllowed(session.company_id);

  const formData = await request.formData();
  const action = formData.get("action");
  const file = formData.get("file");
  if (!file || typeof file === "string") return badRequest("A file is required.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const { headers, dataRows } = parseSpreadsheet(buffer, file.size);

  if (action === "parse") {
    return ok({ headers, previewRows: dataRows.slice(0, 10), totalRows: dataRows.length, suggestedMapping: autoMapColumns(headers) });
  }

  const mappingRaw = formData.get("mapping");
  if (!mappingRaw) return badRequest("Column mapping is required.");
  const mapping = JSON.parse(mappingRaw);
  const defaultLeadSourceId = formData.get("defaultLeadSourceId") || null;
  const defaultServiceId = formData.get("defaultServiceId") || null;

  if (action === "validate") {
    const validation = await validateLeadImportRows(session, dataRows, mapping, { defaultLeadSourceId, defaultServiceId });
    return ok({ validation, fileName: file.name });
  }

  return badRequest("Unknown action.");
}));
