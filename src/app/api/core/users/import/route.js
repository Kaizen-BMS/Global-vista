import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { parseSpreadsheet, validateImportRows, commitImport } from "@/lib/actions/userImport";
import { withCsrf } from "@/lib/helpers/withCsrf";

// Single stateless endpoint handling all three import phases via
// `action`. The file is re-sent by the client on every call — no
// server-side temp file storage needed since the wizard is single-page
// and the file rarely exceeds a few hundred KB.
export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "users.import"))) return forbidden();

  const formData = await request.formData();
  const action = formData.get("action");
  const file = formData.get("file");

  if (!file || typeof file === "string") return badRequest("A file is required.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const { headers, dataRows } = parseSpreadsheet(buffer, file.size);

  if (action === "parse") {
    return ok({
      headers,
      previewRows: dataRows.slice(0, 10),
      totalRows: dataRows.length,
    });
  }

  const mappingRaw = formData.get("mapping");
  if (!mappingRaw) return badRequest("Column mapping is required.");
  const mapping = JSON.parse(mappingRaw);

  if (action === "validate") {
    const validation = await validateImportRows(dataRows, mapping);
    return ok({ validation });
  }

  if (action === "commit") {
    const skipDuplicates = formData.get("skipDuplicates") === "true";
    const sendWelcomeEmails = formData.get("sendWelcomeEmails") === "true";
    const validation = await validateImportRows(dataRows, mapping);
    const result = await commitImport({
      rows: validation.rows,
      fileName: file.name,
      skipDuplicates,
      sendWelcomeEmails,
      importedBy: session.id,
    });
    return ok(result);
  }

  return badRequest("Unknown action.");
}));