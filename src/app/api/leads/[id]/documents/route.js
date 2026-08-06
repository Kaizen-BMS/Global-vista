import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadDocuments, addLeadDocument, deleteLeadDocument } from "@/lib/actions/leadDocuments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const documents = await listLeadDocuments(session, id);
  return ok({ documents });
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.documents.manage"))) return forbidden();
  const body = await request.json();
  if (!body.type || !body.fileName || !body.fileUrl) return badRequest("type, fileName, fileUrl are required.");
  const docId = await addLeadDocument(session, id, body, session.id);
  return created({ id: docId });
}));

export const DELETE = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.documents.manage"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId) return badRequest("docId is required.");
  await deleteLeadDocument(session, docId, id, session.id);
  return ok();
}));