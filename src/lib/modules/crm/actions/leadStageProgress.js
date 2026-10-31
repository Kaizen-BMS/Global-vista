import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { NOT_DELETED } from "@/lib/helpers/db";
import { updateLeadStage } from "@/lib/modules/crm/actions/leads";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";

/**
 * Schools-only "Mark [Stage] Complete" / "Move to Next Stage" flow.
 * `stage_completed_at` (NULL = In-Progress) is reset to NULL by
 * updateLeadStage on every stage change, so completing a stage never
 * silently carries over into the next one.
 */
function assertSchoolFeature(session) {
  if (!session.is_child_company) {
    const e = new Error("Stage completion tracking is only available to sub-companies.");
    e.status = 403;
    throw e;
  }
}

export async function markStageComplete(session, leadId, actorId) {
  assertSchoolFeature(session);
  await pool.query(
    `UPDATE leads SET stage_completed_at = NOW(), updated_by = ? WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`,
    [actorId, leadId, session.company_id]
  );
  await logActivity({ userId: actorId, module: "leads", action: "stage_mark_complete", entityType: "lead", entityId: leadId, companyId: session.company_id, description: `Lead #${leadId} marked complete for its current stage` });
}

export async function moveToNextStage(session, leadId, actorId) {
  assertSchoolFeature(session);
  const [[lead]] = await pool.query(`SELECT stage FROM leads WHERE id = ? AND company_id = ? AND ${NOT_DELETED}`, [leadId, session.company_id]);
  if (!lead) { const e = new Error("Student not found."); e.status = 404; throw e; }

  const stages = await getLeadPipelineStages(session);
  const index = stages.indexOf(lead.stage);
  const next = index >= 0 ? stages[index + 1] : null;
  if (!next) { const e = new Error("Already on the last stage — there is no next stage to move to."); e.status = 400; throw e; }

  await updateLeadStage(session, leadId, next, actorId);
}

export async function bulkMarkStageComplete(session, ids, actorId) {
  if (!ids?.length) return;
  for (const id of ids) await markStageComplete(session, id, actorId);
}

export async function bulkMoveToNextStage(session, ids, actorId) {
  if (!ids?.length) return;
  const errors = [];
  for (const id of ids) {
    try { await moveToNextStage(session, id, actorId); } catch (err) { errors.push({ id, message: err.message }); }
  }
  return { errors };
}
