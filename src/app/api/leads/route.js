import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { validate, leadValidators } from "@/lib/helpers/validation";
import { listLeads, createLead, bulkUpdateStatus, bulkAssign } from "@/lib/modules/crm/actions/leads";
import { bulkAddLeadNote } from "@/lib/modules/crm/actions/leadNotes";
import { bulkMarkStageComplete, bulkMoveToNextStage, bulkMoveToPreviousStage, applyBulkPreviewUpdates } from "@/lib/modules/crm/actions/leadStageProgress";
import { bulkSendLeadEmail } from "@/lib/modules/crm/actions/leadBulkEmail";
import { bulkUpdateStatusAggregated, bulkAddLeadNoteAggregated } from "@/lib/actions/companySwitch";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const { searchParams } = new URL(request.url);
  const result = await listLeads(session, {
    status: searchParams.get("status") || null, stage: searchParams.get("stage") || null,
    priority: searchParams.get("priority") || null, sourceId: searchParams.get("sourceId") || null,
    serviceId: searchParams.get("serviceId") || null, search: searchParams.get("search") || null,
    assignedTo: searchParams.get("assignedTo") || null, country: searchParams.get("country") || null,
    tag: searchParams.get("tag") || null,
    createdFrom: searchParams.get("createdFrom") || null, createdTo: searchParams.get("createdTo") || null,
    followupFrom: searchParams.get("followupFrom") || null, followupTo: searchParams.get("followupTo") || null,
    sort: searchParams.get("sort") || "created_at", dir: searchParams.get("dir") || "DESC",
    page: searchParams.get("page") || 1, pageSize: searchParams.get("pageSize") || 20,
  });
  return ok(result);
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const body = await request.json();

  if (body.bulkAction) {
    if (!(await can(session, "leads.update"))) return forbidden();
    // GVE's combined Leads view: a selection usually spans several
    // schools, not just GVE's own company — these two aggregated variants
    // resolve each id's real owning company first (never trusting the
    // client's ids blindly) instead of writing everything under GVE's own
    // company_id the way the plain bulk* functions below would.
    if (body.bulkAction === "status") {
      if (session.can_create_child_companies) await bulkUpdateStatusAggregated(session, body.ids || [], body.status, session.id);
      else await bulkUpdateStatus(session, body.ids || [], body.status, session.id);
    } else if (body.bulkAction === "assign") {
      if (!(await can(session, "leads.assign"))) return forbidden();
      await bulkAssign(session, body.ids || [], body.assignedTo, session.id);
    } else if (body.bulkAction === "note") {
      if (!(await can(session, "leads.notes.manage"))) return forbidden();
      const result = session.can_create_child_companies
        ? await bulkAddLeadNoteAggregated(session, body.ids || [], body.content, session.id)
        : await bulkAddLeadNote(session, body.ids || [], { content: body.content }, session.id);
      return ok(result);
    } else if (body.bulkAction === "stageComplete") {
      await bulkMarkStageComplete(session, body.ids || [], session.id);
    } else if (body.bulkAction === "stageMove") {
      const result = await bulkMoveToNextStage(session, body.ids || [], session.id, body.note || "");
      return ok(result);
    } else if (body.bulkAction === "stageMoveBack") {
      const result = await bulkMoveToPreviousStage(session, body.ids || [], session.id, body.note || "");
      return ok(result);
    } else if (body.bulkAction === "bulkPreviewUpdate") {
      const result = await applyBulkPreviewUpdates(session, body.rows || [], session.id);
      return ok(result);
    } else if (body.bulkAction === "sendEmail") {
      if (!(await can(session, "leads.notes.manage"))) return forbidden();
      const result = await bulkSendLeadEmail(session, body.ids || [], { subject: body.subject, message: body.message }, session.id);
      return ok(result);
    }
    return ok();
  }

  if (!(await can(session, "leads.create"))) return forbidden();
  const { valid, errors } = validate(body, leadValidators);
  if (!valid) return badRequest("Validation failed.", { errors });
  const id = await createLead(session, body, session.id);
  return created({ id });
}));