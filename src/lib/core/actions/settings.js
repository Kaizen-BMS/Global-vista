import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";

export async function getSettingsByGroup(group) {
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM crm_settings WHERE \`group\` = ?`, [group]);
  return rows.reduce((acc, row) => {
    acc[row.key] = row.value;
    return acc;
  }, {});
}

export async function getAllSettings() {
  const [rows] = await pool.query(`SELECT \`key\`, \`value\`, \`group\` FROM crm_settings ORDER BY \`group\`, \`key\``);
  const grouped = {};
  for (const row of rows) {
    grouped[row.group] = grouped[row.group] || {};
    grouped[row.group][row.key] = row.value;
  }
  return grouped;
}

export async function updateSettings(group, values, updatedBy) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const [key, value] of Object.entries(values)) {
      await conn.query(
        `INSERT INTO crm_settings (\`key\`, \`value\`, \`group\`, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_by = VALUES(updated_by)`,
        [key, value === null || value === undefined ? "" : String(value), group, updatedBy, updatedBy]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await logActivity({
    userId: updatedBy,
    module: "settings",
    action: "update",
    entityType: "crm_settings",
    description: `Updated "${group}" settings`,
    meta: { group, keys: Object.keys(values) },
  });
}