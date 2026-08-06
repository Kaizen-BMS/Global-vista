import "server-only";
import { pool } from "@/lib/db";

export function requireCompany(session) {
  if (!session?.company_id) { const e = new Error("No company context on this session."); e.status = 401; throw e; }
  return session.company_id;
}
export async function getEnabledModuleSlugs(companyId) {
  const [rows] = await pool.query(
    `SELECT m.slug FROM company_modules cm JOIN modules m ON m.id = cm.module_id
     WHERE cm.company_id = ? AND cm.enabled = 1 AND cm.licensed = 1 AND (cm.expires_at IS NULL OR cm.expires_at > NOW())`,
    [companyId]
  );
  return rows.map((r) => r.slug);
}
export async function isModuleEnabledForCompany(companyId, slug) {
  return (await getEnabledModuleSlugs(companyId)).includes(slug);
}
export async function getSubscriptionState(companyId) {
  const [[sub]] = await pool.query(
    `SELECT cs.*, p.name AS plan_name FROM company_subscriptions cs JOIN plans p ON p.id = cs.plan_id
     WHERE cs.company_id = ? ORDER BY cs.created_at DESC LIMIT 1`, [companyId]
  );
  if (!sub) return "no_subscription";
  if (sub.status === "cancelled") return "cancelled";
  if (sub.ends_at && new Date(sub.ends_at) < new Date()) return "expired";
  return sub.status;
}

export async function getCurrentCompany(companyId) {
  const [[company]] = await pool.query(
    `
      SELECT *
      FROM companies
      WHERE id = ?
      LIMIT 1
    `,
    [companyId]
  );

  if (!company) {
    const err = new Error("Company not found.");
    err.status = 404;
    throw err;
  }

  return company;
}