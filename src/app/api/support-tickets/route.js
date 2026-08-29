import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { listCompanyTickets, createSupportTicket } from "@/lib/platform/actions/supportTickets";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!session) return unauthorized();
  const tickets = await listCompanyTickets(session);
  return ok({ tickets });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const body = await request.json();
  if (!body.subject?.trim() || !body.description?.trim()) return badRequest("Subject and description are required.");
  const id = await createSupportTicket(session, body, session.id);
  return created({ id });
}));
