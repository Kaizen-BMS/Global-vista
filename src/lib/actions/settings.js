import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function getSettingsByGroup(session, group) {
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM crm_settings WHERE \`group\`=? AND company_id=?`, [group, session.company_id]);
  return rows.reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
}
export async function updateSettings(session, group, values, updatedBy) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(values)) {
      await conn.query(`INSERT INTO crm_settings (company_id, \`key\`, \`value\`, \`group\`, created_by, updated_by) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`), updated_by=VALUES(updated_by)`,
        [session.company_id, key, value == null ? "" : String(value), group, updatedBy, updatedBy]);
    }
    await conn.commit();
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
  await logActivity({ userId: updatedBy, module: "settings", action: "update", entityType: "crm_settings", description: `Updated ${group} settings`, meta: { group }, companyId: session.company_id });
}