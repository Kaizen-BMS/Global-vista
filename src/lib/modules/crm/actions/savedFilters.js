import "server-only";
import { pool } from "@/lib/db";

const GROUP = "lead_filters";
const keyFor = (userId, slug) => `u${userId}__${slug}`;
const slugify = (name) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);

export async function listSavedFilters(session) {
  const prefix = `u${session.id}__`;
  const [rows] = await pool.query(
    `SELECT \`key\`, \`value\` FROM crm_settings WHERE company_id=? AND \`group\`=? AND \`key\` LIKE ?`,
    [session.company_id, GROUP, `${prefix}%`]
  );
  return rows.map((r) => {
    let params = {};
    try { params = JSON.parse(r.value); } catch { params = {}; }
    return { slug: r.key.slice(prefix.length), name: params.__name || r.key.slice(prefix.length), params };
  });
}

export async function saveFilter(session, name, params) {
  const slug = slugify(name);
  if (!slug) { const e = new Error("Filter name is required."); e.status = 400; throw e; }
  const key = keyFor(session.id, slug);
  const value = JSON.stringify({ ...params, __name: name.trim() });
  await pool.query(
    `INSERT INTO crm_settings (company_id, \`key\`, \`value\`, \`group\`, created_by, updated_by) VALUES (?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE \`value\`=VALUES(\`value\`), updated_by=VALUES(updated_by)`,
    [session.company_id, key, value, GROUP, session.id, session.id]
  );
  return slug;
}

export async function deleteFilter(session, slug) {
  await pool.query(`DELETE FROM crm_settings WHERE company_id=? AND \`group\`=? AND \`key\`=?`, [session.company_id, GROUP, keyFor(session.id, slug)]);
}
