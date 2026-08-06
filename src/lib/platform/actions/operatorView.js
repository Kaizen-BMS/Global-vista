import "server-only";
import { pool } from "@/lib/db";

/**
 * Platform Operator "view as company" — NOT a real session switch, NOT
 * a change to users.company_id. This resolves which company_id an
 * operator's current request should be scoped to when browsing
 * /platform/companies/[id]/... pages, stored only in a short-lived
 * cookie (set below), never persisted to the user record. Regular
 * company users never see or use this — it's operator-only tooling.
 */
export async function listCompaniesForSwitcher() {
  const [rows] = await pool.query(`SELECT id, name, slug, status FROM companies WHERE status != 'deleted' ORDER BY name`);
  return rows;
}