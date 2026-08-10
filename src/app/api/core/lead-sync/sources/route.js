import { getSession } from "@/lib/auth";
import { canViewAllRecords } from "@/lib/modules/crm/rls";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listSyncSources, createSyncSource } from "@/lib/actions/leadSync";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  return ok({ sources: await listSyncSources(session) });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!canViewAllRecords(session)) return forbidden();
  const body = await request.json();
  if (!body.name || !body.spreadsheetId) return badRequest("Name and Spreadsheet ID are required.");
  const id = await createSyncSource(session, body, session.id);
  return created({ id });
}));
