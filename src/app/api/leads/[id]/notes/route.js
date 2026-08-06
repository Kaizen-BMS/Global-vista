import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadNotes, addLeadNote } from "@/lib/modules/crm/actions/leadNotes";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const notes = await listLeadNotes(session, id);
  return ok({ notes });
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.notes.manage"))) return forbidden();
  const body = await request.json();
  if (!body.content) return badRequest("Note content is required.");
  const noteId = await addLeadNote(session, id, body, session.id);
  return created({ id: noteId });
}));