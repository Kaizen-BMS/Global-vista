import "server-only";
import { pool } from "@/lib/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

/**
 * Combines the two separate document tables (lead_documents,
 * employee_documents — there is no generic "documents" entity in the
 * schema) into one company-scoped list for the Documents report.
 * Lead documents additionally respect RLS visibility.
 */
export async function listAllDocuments(session) {
  const { where, params } = await getVisibleLeadFilter(session);
  const [leadDocs] = await pool.query(
    `SELECT d.id, 'Lead' AS source, d.type, d.file_name, d.file_size, u.name AS uploaded_by_name, d.created_at,
            l.name AS related_to, l.lead_number AS related_number
     FROM lead_documents d
     JOIN leads l ON l.id = d.lead_id AND l.is_deleted = 0 AND ${where}
     LEFT JOIN users u ON u.id = d.uploaded_by
     WHERE d.company_id = ?`,
    [...params, session.company_id]
  );
  const [empDocs] = await pool.query(
    `SELECT ed.id, 'Employee' AS source, dt.name AS type, ed.file_name, ed.file_size, up.name AS uploaded_by_name, ed.created_at,
            eu.name AS related_to, eu.employee_id AS related_number
     FROM employee_documents ed
     JOIN users eu ON eu.id = ed.user_id AND eu.is_deleted = 0 AND eu.company_id = ?
     JOIN employee_document_types dt ON dt.id = ed.document_type_id
     LEFT JOIN users up ON up.id = ed.uploaded_by
     WHERE ed.is_deleted = 0 AND ed.company_id = ?`,
    [session.company_id, session.company_id]
  );
  return [...leadDocs, ...empDocs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
