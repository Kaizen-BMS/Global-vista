import "server-only";
import { pool } from "@/lib/db";

/**
 * Schools-only "Student ID" — SchoolCode-Year-Sequence (e.g. KHL-2026-0001),
 * mirrors generateLeadNumber()'s shape but prefixed with a short code
 * derived from the company's own short_name/slug so it reads as "this
 * school's own ID", not the generic cross-tenant Lead Number. Never shown
 * as editable — generated here, once, at createLead time.
 */
export async function generateStudentCode(companyId) {
  const [[company]] = await pool.query(`SELECT short_name, slug FROM companies WHERE id = ?`, [companyId]);
  const source = (company?.short_name || company?.slug || "SCH").replace(/[^a-zA-Z]/g, "");
  const prefix = (source.slice(0, 4) || "SCH").toUpperCase();

  const year = new Date().getFullYear();
  const [[{ count }]] = await pool.query(
    `SELECT COUNT(*) AS count FROM leads WHERE company_id = ? AND student_code LIKE ?`,
    [companyId, `${prefix}-${year}-%`]
  );
  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}-${year}-${seq}`;
}
