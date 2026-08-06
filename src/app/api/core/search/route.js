import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return ok({ groups: [] });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return ok({ groups: [] });
  const like = `%${q}%`;
  const groups = [];

  if (await can(session, "leads.view")) {
    const { where, params } = getVisibleLeadFilter(session);
    const [leads] = await pool.query(
      `SELECT id, name, phone, email, lead_number, stage FROM leads l
       WHERE ${where} AND l.is_deleted=0 AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ?)
       ORDER BY l.created_at DESC LIMIT 8`,
      [...params, like, like, like, like]
    );
    if (leads.length) {
      groups.push({
        group: "Leads",
        results: leads.map((l) => ({ id: l.id, title: l.name, subtitle: `${l.lead_number} · ${l.phone} · ${l.stage}`, href: `/workspace/lead-management/${l.id}` })),
      });
    }
  }

  if (await can(session, "users.view")) {
    const [users] = await pool.query(`SELECT id, name, email FROM users WHERE is_deleted=0 AND company_id=? AND (name LIKE ? OR email LIKE ?) LIMIT 8`, [session.company_id, like, like]);
    if (users.length) {
      groups.push({
        group: "Users",
        results: users.map((u) => ({ id: u.id, title: u.name, subtitle: u.email, href: `/workspace/users/${u.id}` })),
      });
    }
  }

  return ok({ groups });
});