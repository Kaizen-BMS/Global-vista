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