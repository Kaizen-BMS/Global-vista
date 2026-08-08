import "server-only";
import { pool } from "@/lib/db";

export async function getPlatformSettingsByGroup(group) {
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM platform_settings WHERE \`group\` = ?`, [group]);
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

/** The zone every Platform Console screen displays in, unless/until a
 * per-operator preference is added — configured once in Platform Settings
 * rather than defaulting to raw UTC. */
export async function getPlatformTimezone() {
  const general = await getPlatformSettingsByGroup("general");
  return general.default_timezone || "UTC";
}
