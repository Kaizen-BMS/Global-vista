import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { listAggregatedSchoolLeads } from "@/lib/actions/companySwitch";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return ok({ groups: [] });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return ok({ groups: [] });
  const like = `%${q}%`;
  const groups = [];
  const isGveParent = !session.is_child_company && !!session.can_create_child_companies;

  if (await can(session, "leads.view")) {
    // GVE's own global search used to run getVisibleLeadFilter against
    // GVE's own (near-empty, Direct-Lead-only) company_id — reusing the
    // same aggregated search listAggregatedSchoolLeads already offers on
    // the Leads page itself (every school + GVE, matched by school name
    // too) instead, so typing anything here actually finds a school's
    // leads, not just GVE's own handful.
    const leads = isGveParent
      ? (await listAggregatedSchoolLeads(session, { search: q, pageSize: 8 })).leads
      : await (async () => {
          const { where, params } = await getVisibleLeadFilter(session);
          const [rows] = await pool.query(
            `SELECT id, name, phone, email, lead_number, stage FROM leads l
             WHERE ${where} AND l.is_deleted=0 AND (l.name LIKE ? OR l.phone LIKE ? OR l.email LIKE ? OR l.lead_number LIKE ?)
             ORDER BY l.created_at DESC LIMIT 8`,
            [...params, like, like, like, like]
          );
          return rows;
        })();
    if (leads.length) {
      groups.push({
        group: "Leads",
        results: leads.map((l) => ({
          id: l.id, title: l.name,
          subtitle: isGveParent ? `${l.lead_number} · ${l.school_name || "Direct Lead"} · ${l.stage}` : `${l.lead_number} · ${l.phone} · ${l.stage}`,
          href: `/workspace/lead-management/${l.id}`,
        })),
      });
    }
  }

  // GVE only — lets typing a school's name jump straight to that
  // school's own slice of the combined Leads list, same as picking it
  // from the School filter dropdown would.
  if (isGveParent) {
    const [schools] = await pool.query(
      `SELECT id, name FROM companies WHERE parent_company_id = ? AND status != 'deleted' AND name LIKE ? LIMIT 8`,
      [session.company_id, like]
    );
    if (schools.length) {
      groups.push({
        group: "Schools",
        results: schools.map((s) => ({ id: s.id, title: s.name, subtitle: "School", href: `/workspace/lead-management?school=${s.id}` })),
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