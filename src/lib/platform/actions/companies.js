import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";

export async function listCompanies() {
  const [rows] = await pool.query(
    `SELECT c.*, (SELECT COUNT(*) FROM users u WHERE u.company_id=c.id AND u.is_deleted=0) AS user_count,
            (SELECT COUNT(*) FROM company_modules cm WHERE cm.company_id=c.id AND cm.enabled=1) AS enabled_module_count
     FROM companies c ORDER BY c.created_at DESC`
  );
  return rows;
}
export async function getCompanyDetail(id) {
  const [[company]] = await pool.query(`SELECT * FROM companies WHERE id=?`, [id]);
  if (!company) return null;
  const [modules] = await pool.query(
    `SELECT m.id, m.name, m.slug, m.icon, m.category, cm.enabled FROM modules m
     LEFT JOIN company_modules cm ON cm.module_id=m.id AND cm.company_id=? ORDER BY m.sort_order`, [id]
  );
  return { ...company, modules };
}
export async function updateCompanyBranding(id, { logoUrl, faviconUrl, primaryColor, secondaryColor, website, contactEmail, contactPhone, address }, updatedBy) {
  await pool.query(
    `UPDATE companies SET logo_url=?, favicon_url=?, primary_color=?, secondary_color=?, website=?, contact_email=?, contact_phone=?, address=?, updated_by=? WHERE id=?`,
    [logoUrl || null, faviconUrl || null, primaryColor || "#4f46e5", secondaryColor || "#171717", website || null, contactEmail || null, contactPhone || null, address || null, updatedBy, id]
  );
  await logActivity({ userId: updatedBy, module: "platform", action: "branding_update", entityType: "company", entityId: id, description: "Updated branding", companyId: id });
}
export async function setCompanyStatus(id, status, updatedBy) {
  const [[company]] = await pool.query(`SELECT name FROM companies WHERE id=?`, [id]);
  await pool.query(`UPDATE companies SET status=?, updated_by=? WHERE id=?`, [status, updatedBy, id]);
  await logActivity({ userId: updatedBy, module: "platform", action: `company_${status}`, entityType: "company", entityId: id, description: `Set to ${status}`, companyId: id });

  const [operators] = await pool.query(`SELECT id, company_id FROM users WHERE is_platform_operator=1 AND is_deleted=0 AND id != ?`, [updatedBy]);
  for (const op of operators) {
    await createNotification(op.company_id, op.id, {
      title: "Company status changed",
      message: `${company?.name || `Company #${id}`} set to ${status}`,
      type: "company_updated",
      link: `/platform/companies/${id}`,
    });
  }
}
export async function setCompanyModule(companyId, moduleId, enabled, updatedBy) {
  await pool.query(`INSERT INTO company_modules (company_id, module_id, enabled, enabled_by) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE enabled=VALUES(enabled), enabled_by=VALUES(enabled_by)`, [companyId, moduleId, enabled ? 1 : 0, updatedBy]);
  await logActivity({ userId: updatedBy, module: "platform", action: enabled ? "module_enabled" : "module_disabled", entityType: "company_module", entityId: moduleId, description: `Module ${enabled ? "enabled" : "disabled"}`, companyId });
}
export async function listAllModules() { const [rows] = await pool.query(`SELECT * FROM modules ORDER BY sort_order`); return rows; }
export async function listModuleAdoption() {
  const [rows] = await pool.query(`
    SELECT m.*, COUNT(cm.id) AS company_count
    FROM modules m LEFT JOIN company_modules cm ON cm.module_id = m.id AND cm.enabled = 1
    GROUP BY m.id ORDER BY m.sort_order
  `);
  return rows;
}
export async function listPlans() { const [rows] = await pool.query(`SELECT * FROM plans WHERE status='active' ORDER BY name`); return rows; }

/**
 * Permanent, hard deletion of a tenant and every row it owns — not the
 * `status='deleted'` soft-flag (that enum value exists for display/
 * filtering, this is the real, irreversible purge the operator explicitly
 * confirmed by typing the company's name).
 *
 * Most company_id FKs in this schema are ON DELETE RESTRICT, not CASCADE
 * (verified against live information_schema, not assumed) — so this can't
 * be a single `DELETE FROM companies`. Each statement below exists
 * because something would otherwise block the next one; the order is the
 * actual dependency graph, leaves first:
 *   - leads.duplicate_of self-references leads -> null it out first so a
 *     same-company duplicate pair can't block each other's deletion.
 *   - lead_form_submissions/lead_form_views restrict on lead_forms.id and
 *     leads.id -> deleted before both.
 *   - lead_sync_sources cascades to its own runs/records -> only the
 *     source row needs an explicit delete.
 *   - leads cascades to lead_documents/lead_followups/lead_notes/
 *     lead_tasks/lead_assignment_history automatically once the RESTRICT
 *     blockers above are gone.
 *   - employee_documents before employee_document_types (restrict on
 *     document_type_id).
 *   - users last among tenant content, because leads/lead_forms/
 *     lead_import_history/lead_sync_sources/employee_documents all
 *     restrict-reference users.id and must be gone first; user_sessions,
 *     user_roles, password_history, user_login_history, notifications,
 *     company_user_history all cascade off users.id automatically.
 *   - roles after users (users.role_id restricts roles).
 *   - companies last of all — company_domains, company_modules,
 *     company_provisioning_log, company_settings, and
 *     company_subscriptions (which itself cascades subscription_history)
 *     all have real ON DELETE CASCADE and clean up automatically here.
 *
 * designations/employee_types/academic_sessions are confirmed NOT
 * company-scoped (no company_id column at all) — global shared taxonomy,
 * never touched. platform_events.company_id has no FK constraint at all;
 * cleaned up as a courtesy, not because it would block anything.
 */
export async function deleteCompany(id, operatorId) {
  const [[company]] = await pool.query(`SELECT id, name FROM companies WHERE id = ?`, [id]);
  if (!company) { const e = new Error("Company not found."); e.status = 404; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`UPDATE leads SET duplicate_of = NULL WHERE company_id = ?`, [id]);

    await conn.query(`DELETE FROM lead_form_submissions WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM lead_form_views WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM lead_sync_sources WHERE company_id = ?`, [id]); // cascades lead_sync_runs, lead_sync_records
    await conn.query(`DELETE FROM lead_import_history WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM user_import_history WHERE company_id = ?`, [id]);

    await conn.query(`DELETE FROM leads WHERE company_id = ?`, [id]); // cascades lead_documents, lead_followups, lead_notes, lead_tasks, lead_assignment_history
    await conn.query(`DELETE FROM lead_forms WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM lead_sources WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM services WHERE company_id = ?`, [id]);

    await conn.query(`DELETE FROM employee_documents WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM employee_document_types WHERE company_id = ?`, [id]);

    await conn.query(`DELETE FROM notifications WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM activity_logs WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM crm_settings WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM platform_events WHERE company_id = ?`, [id]);

    await conn.query(`DELETE FROM users WHERE company_id = ?`, [id]); // cascades user_sessions, user_roles, password_history, user_login_history, company_user_history
    await conn.query(`DELETE FROM branches WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM departments WHERE company_id = ?`, [id]);
    await conn.query(`DELETE FROM roles WHERE company_id = ?`, [id]); // cascades role_permissions

    await conn.query(`DELETE FROM companies WHERE id = ?`, [id]); // cascades company_domains, company_modules, company_provisioning_log, company_settings, company_subscriptions (+subscription_history)

    // activity_logs.company_id is NOT NULL with an ON DELETE RESTRICT FK —
    // it genuinely cannot hold a record about a company that no longer
    // exists. platform_events.company_id has no FK constraint at all,
    // which is exactly what a "this company used to exist" audit record
    // needs — logged inside the same transaction so it can never exist
    // without the deletion actually having happened, or vice versa.
    await conn.query(
      `INSERT INTO platform_events (company_id, event_name, payload, triggered_by) VALUES (?, 'company_deleted', ?, ?)`,
      [id, JSON.stringify({ companyName: company.name }), operatorId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}