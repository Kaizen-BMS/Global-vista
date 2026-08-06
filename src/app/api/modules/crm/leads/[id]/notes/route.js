import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadNotes, addLeadNote } from "@/lib/actions/leadNotes";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const notes = await listLeadNotes(id, session);
  return ok({ notes });
});

export const POST = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.notes.manage"))) return forbidden();
  const body = await request.json();
  if (!body.content) return badRequest("Note content is required.");
  const noteId = await addLeadNote(id, body, session.id);
  return created({ id: noteId });
});