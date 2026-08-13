import "server-only";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { NOT_DELETED } from "@/lib/helpers/db";

function slugify(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);
}

/** companies.slug and lead_forms.slug are both single-column globally-unique — same pattern as provisioning's getUniqueCompanySlug(). */
async function getUniqueFormSlug(baseSlug) {
  let slug = baseSlug || crypto.randomBytes(4).toString("hex");
  let i = 1;
  while (true) {
    const [rows] = await pool.query(`SELECT id FROM lead_forms WHERE slug=? LIMIT 1`, [slug]);
    if (!rows.length) return slug;
    slug = `${baseSlug}-${i++}`;
  }
}

export async function listLeadForms(session) {
  const [rows] = await pool.query(
    `SELECT f.*, cu.name AS created_by_name,
            (SELECT COUNT(*) FROM lead_form_views v WHERE v.form_id=f.id) AS view_count,
            (SELECT COUNT(*) FROM lead_form_submissions s WHERE s.form_id=f.id AND s.status='success') AS submission_count,
            (SELECT COUNT(DISTINCT s.lead_id) FROM lead_form_submissions s WHERE s.form_id=f.id AND s.status='success' AND s.lead_id IS NOT NULL) AS leads_created_count,
            (SELECT COUNT(*) FROM lead_form_views v WHERE v.form_id=f.id) + (SELECT COUNT(*) FROM lead_form_submissions s WHERE s.form_id=f.id AND s.status='success') AS conv_denominator
     FROM lead_forms f LEFT JOIN users cu ON cu.id = f.created_by
     WHERE f.company_id=? AND f.${NOT_DELETED} ORDER BY f.created_at DESC`,
    [session.company_id]
  );
  return rows.map((r) => {
    const { conv_denominator, ...rest } = r;
    return { ...rest, conversion_rate: conv_denominator > 0 ? Math.round((r.submission_count / conv_denominator) * 1000) / 10 : 0 };
  });
}

export async function getLeadForm(session, id) {
  const [[row]] = await pool.query(
    `SELECT f.*, cu.name AS created_by_name FROM lead_forms f LEFT JOIN users cu ON cu.id = f.created_by
     WHERE f.id=? AND f.company_id=? AND f.${NOT_DELETED}`,
    [id, session.company_id]
  );
  if (!row) return null;
  return { ...row, fields_config: JSON.parse(row.fields_config || "[]"), theme_config: JSON.parse(row.theme_config || "{}") };
}

export async function createLeadForm(session, data, createdBy) {
  const slug = await getUniqueFormSlug(slugify(data.slug || data.name));
  const [result] = await pool.query(
    `INSERT INTO lead_forms (
      company_id, name, slug, description, fields_config, default_lead_source_id, default_service_id,
      default_assigned_to, default_tags, campaign, success_message, redirect_url, notify_emails,
      theme_config, status, recaptcha_enabled, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      session.company_id, data.name, slug, data.description || null, JSON.stringify(data.fields || []),
      data.defaultLeadSourceId || null, data.defaultServiceId || null, data.defaultAssignedTo || null,
      data.defaultTags || null, data.campaign || null, data.successMessage || null, data.redirectUrl || null,
      data.notifyEmails || null, JSON.stringify(data.theme || {}), data.status || "active",
      data.recaptchaEnabled ? 1 : 0, createdBy, createdBy,
    ]
  );
  await logActivity({ userId: createdBy, module: "leads", action: "form_create", entityType: "lead_form", entityId: result.insertId, companyId: session.company_id, description: `Created query form "${data.name}"` });
  return result.insertId;
}

export async function updateLeadForm(session, id, data, updatedBy) {
  await pool.query(
    `UPDATE lead_forms SET name=?, description=?, fields_config=?, default_lead_source_id=?, default_service_id=?,
      default_assigned_to=?, default_tags=?, campaign=?, success_message=?, redirect_url=?, notify_emails=?,
      theme_config=?, status=?, recaptcha_enabled=?, updated_by=? WHERE id=? AND company_id=? AND ${NOT_DELETED}`,
    [
      data.name, data.description || null, JSON.stringify(data.fields || []), data.defaultLeadSourceId || null,
      data.defaultServiceId || null, data.defaultAssignedTo || null, data.defaultTags || null, data.campaign || null,
      data.successMessage || null, data.redirectUrl || null, data.notifyEmails || null, JSON.stringify(data.theme || {}),
      data.status || "active", data.recaptchaEnabled ? 1 : 0, updatedBy, id, session.company_id,
    ]
  );
  await logActivity({ userId: updatedBy, module: "leads", action: "form_update", entityType: "lead_form", entityId: id, companyId: session.company_id, description: `Updated query form #${id}` });
}

/**
 * Copies an existing Query Form into a brand-new one: new id, new unique
 * slug, ownership transferred to whoever duplicated it (not the original
 * creator) — matches "Each copied form gets its own ID and ownership" and
 * "Do not destroy the original template when copying." The source form is
 * untouched. New copies start `inactive` so a half-renamed duplicate can't
 * go live on the public URL before someone reviews it.
 */
export async function duplicateLeadForm(session, id, actorId) {
  const source = await getLeadForm(session, id);
  if (!source) { const e = new Error("Query Form not found."); e.status = 404; throw e; }

  const newName = `${source.name} (Copy)`;
  const slug = await getUniqueFormSlug(slugify(newName));
  const [result] = await pool.query(
    `INSERT INTO lead_forms (
      company_id, name, slug, description, fields_config, default_lead_source_id, default_service_id,
      default_assigned_to, default_tags, campaign, success_message, redirect_url, notify_emails,
      theme_config, status, recaptcha_enabled, created_by, updated_by
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      session.company_id, newName, slug, source.description, JSON.stringify(source.fields_config || []),
      source.default_lead_source_id, source.default_service_id, source.default_assigned_to, source.default_tags,
      source.campaign, source.success_message, source.redirect_url, source.notify_emails,
      JSON.stringify(source.theme_config || {}), "inactive", source.recaptcha_enabled, actorId, actorId,
    ]
  );
  await logActivity({
    userId: actorId, module: "leads", action: "form_duplicate", entityType: "lead_form", entityId: result.insertId,
    companyId: session.company_id, description: `Duplicated query form "${source.name}" as "${newName}"`,
  });
  return result.insertId;
}

export async function deleteLeadForm(session, id, deletedBy) {
  await pool.query(`UPDATE lead_forms SET is_deleted=1, deleted_at=NOW(), status='inactive' WHERE id=? AND company_id=?`, [id, session.company_id]);
  await logActivity({ userId: deletedBy, module: "leads", action: "form_delete", entityType: "lead_form", entityId: id, companyId: session.company_id, description: `Deleted lead form #${id}` });
}

export async function getLeadFormAnalytics(session, id) {
  const form = await getLeadForm(session, id);
  if (!form) return null;

  const [[viewCounts]] = await pool.query(
    `SELECT SUM(source='link') AS views, SUM(source='qr') AS scans FROM lead_form_views WHERE form_id=?`, [id]
  );
  const [[submissionCounts]] = await pool.query(
    `SELECT COUNT(*) AS total, SUM(status='success') AS successful, AVG(NULLIF(completion_ms,0)) AS avgCompletionMs
     FROM lead_form_submissions WHERE form_id=?`, [id]
  );
  const [topDevices] = await pool.query(`SELECT device, COUNT(*) AS count FROM lead_form_views WHERE form_id=? AND device IS NOT NULL GROUP BY device ORDER BY count DESC LIMIT 5`, [id]);
  const [topCountries] = await pool.query(`SELECT country, COUNT(*) AS count FROM lead_form_views WHERE form_id=? AND country IS NOT NULL GROUP BY country ORDER BY count DESC LIMIT 5`, [id]);
  const [topBrowsers] = await pool.query(`SELECT browser, COUNT(*) AS count FROM lead_form_views WHERE form_id=? AND browser IS NOT NULL GROUP BY browser ORDER BY count DESC LIMIT 5`, [id]);
  const [recentSubmissions] = await pool.query(
    `SELECT s.id, s.status, s.device, s.browser, s.country, s.created_at, l.id AS lead_id, l.name AS lead_name
     FROM lead_form_submissions s LEFT JOIN leads l ON l.id = s.lead_id
     WHERE s.form_id=? ORDER BY s.created_at DESC LIMIT 20`, [id]
  );

  const views = Number(viewCounts?.views || 0);
  const scans = Number(viewCounts?.scans || 0);
  const totalViews = views + scans;
  const submissions = Number(submissionCounts?.successful || 0);

  return {
    form,
    views, scans, totalViews, submissions,
    conversionRate: totalViews > 0 ? Math.round((submissions / totalViews) * 1000) / 10 : 0,
    avgCompletionSeconds: submissionCounts?.avgCompletionMs ? Math.round(submissionCounts.avgCompletionMs / 100) / 10 : null,
    topDevices, topCountries, topBrowsers, recentSubmissions,
  };
}
