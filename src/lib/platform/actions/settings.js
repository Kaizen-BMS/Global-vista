import "server-only";
import { pool } from "@/lib/db";

export async function getPlatformSettingsByGroup(group) {
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM platform_settings WHERE \`group\` = ?`, [group]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
