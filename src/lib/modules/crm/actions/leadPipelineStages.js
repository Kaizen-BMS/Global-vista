import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { LEAD_STAGES } from "@/lib/modules/crm/constants/leadStages";

/**
 * A company with zero rows here renders the hardcoded LEAD_STAGES default
 * exactly as today (every existing/non-child company). A company with rows
 * (currently only schools, seeded at provisioning) uses those instead, in
 * `display_order`.
 */
export async function getLeadPipelineStages(session) {
  const [rows] = await pool.query(
    `SELECT name FROM lead_pipeline_stages WHERE company_id=? AND is_deleted=0 AND status='active' ORDER BY display_order ASC, id ASC`,
    [session.company_id]
  );
  if (rows.length === 0) return LEAD_STAGES;
  return rows.map((r) => r.name);
}

/**
 * The live "Add+" affordance on a school's Kanban board. Gated here too
 * (not just hidden in the UI) since a non-child company has no use for a
 * custom pipeline and shouldn't be able to create one via a direct call.
 */
export async function addLeadPipelineStage(session, name, actorId) {
  if (!session.is_child_company) {
    const e = new Error("Custom pipeline stages are only available to sub-companies.");
    e.status = 403;
    throw e;
  }
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    const e = new Error("Stage name is required.");
    e.status = 400;
    throw e;
  }

  const [[dupe]] = await pool.query(
    `SELECT id FROM lead_pipeline_stages WHERE company_id=? AND name=? AND is_deleted=0`,
    [session.company_id, trimmed]
  );
  if (dupe) {
    const e = new Error(`A stage named "${trimmed}" already exists.`);
    e.status = 400;
    throw e;
  }

  // See the identical fix/comment in leadCustomFields.js's
  // createLeadCustomField — mysql2 decodes this aggregate as a string once
  // rows exist, so `maxOrder + 1` without the cast silently
  // string-concatenates instead of adding.
  const [[{ maxOrder }]] = await pool.query(
    `SELECT COALESCE(MAX(display_order), -1) AS maxOrder FROM lead_pipeline_stages WHERE company_id=?`,
    [session.company_id]
  );
  const [result] = await pool.query(
    `INSERT INTO lead_pipeline_stages (company_id, name, display_order, created_by, updated_by) VALUES (?,?,?,?,?)`,
    [session.company_id, trimmed, Number(maxOrder) + 1, actorId, actorId]
  );
  await logActivity({ userId: actorId, module: "leads", action: "pipeline_stage_create", entityType: "lead_pipeline_stage", entityId: result.insertId, companyId: session.company_id, description: `Added pipeline stage "${trimmed}"` });
  return result.insertId;
}
