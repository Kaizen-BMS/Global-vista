import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadMeetings, createMeeting, rescheduleMeeting, cancelMeeting, completeMeeting } from "@/lib/modules/crm/actions/leadMeetings";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const meetings = await listLeadMeetings(session, id);
  return ok({ meetings });
});

// Same single-endpoint, body.action dispatch convention as /api/leads/[id]/followups.
export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.followups.manage"))) return forbidden();
  const body = await request.json();

  if (body.action === "reschedule") {
    if (!body.meetingId || !body.startsAt || !body.endsAt) return badRequest("meetingId, startsAt and endsAt are required.");
    await rescheduleMeeting(session, body.meetingId, id, body, session.id);
    return ok();
  }
  if (body.action === "cancel") {
    if (!body.meetingId) return badRequest("meetingId is required.");
    await cancelMeeting(session, body.meetingId, id, session.id);
    return ok();
  }
  if (body.action === "complete") {
    if (!body.meetingId) return badRequest("meetingId is required.");
    await completeMeeting(session, body.meetingId, id, body, session.id);
    return ok();
  }

  if (!body.title || !body.startsAt || !body.endsAt || !body.meetingType) return badRequest("Title, meeting type, start and end time are required.");
  const meetingId = await createMeeting(session, id, body, session.id);
  return created({ id: meetingId });
}));
