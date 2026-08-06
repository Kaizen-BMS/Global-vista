import { LEAD_STAGES } from "@/lib/modules/crm/constants/leadStages";

/**
 * There is no `score` column on `leads` — this is computed on the fly
 * from real signals already loaded for the lead-detail page (never
 * persisted, never fabricated): how far along the pipeline the lead
 * is, how much engagement it has, and how recently it was touched.
 * Always label this in the UI as computed, not a stored field.
 */
export function computeLeadScore(lead, { notesCount = 0, tasksCount = 0, followupsCount = 0 } = {}) {
  const stageIndex = LEAD_STAGES.indexOf(lead.stage);
  const stageScore = stageIndex >= 0 ? Math.round((stageIndex / (LEAD_STAGES.length - 1)) * 40) : 0;

  const engagement = notesCount + tasksCount + followupsCount;
  const engagementScore = Math.min(30, engagement * 5);

  const lastTouched = lead.updated_at ? new Date(lead.updated_at) : null;
  const daysSince = lastTouched ? Math.floor((Date.now() - lastTouched.getTime()) / 86400000) : 999;
  const recencyScore = daysSince <= 1 ? 30 : daysSince <= 7 ? 22 : daysSince <= 30 ? 12 : daysSince <= 90 ? 5 : 0;

  const total = Math.min(100, stageScore + engagementScore + recencyScore);
  const band = total >= 70 ? "Hot" : total >= 40 ? "Warm" : "Cold";
  return { total, band, stageScore, engagementScore, recencyScore };
}
