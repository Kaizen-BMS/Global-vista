import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

const TABLES = {
  country: { table: "countries", parentCol: null },
  state: { table: "states", parentCol: "country_id" },
  city: { table: "cities", parentCol: "state_id" },
};

/**
 * Search-as-you-type geography lookup — never returns the full table to the
 * browser (LIMIT 20), server-side LIKE search, parent-scoped for state/city
 * so "type to search" naturally narrows to the selected country/state.
 * Countries/states/cities are shared reference data (no company_id — same
 * as every other geography action), so this only needs a session to exist,
 * not any company-scoping.
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return badRequest("Not authenticated.");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const q = (searchParams.get("q") || "").trim();
  const parentId = searchParams.get("parentId");

  const spec = TABLES[type];
  if (!spec) return badRequest("Invalid geography type.");

  // Scope to the parent when one was resolved (selecting a country/state
  // narrows the next field's suggestions); otherwise search unscoped rather
  // than returning nothing — country/state/city are stored as free text on
  // leads (no FK), so a state/city typed without a resolved parent must
  // still be usable, especially while the reference tables are sparsely seeded.
  const where = ["is_deleted = 0", "status = 'active'"];
  const params = [];
  if (spec.parentCol && parentId) { where.push(`${spec.parentCol} = ?`); params.push(parentId); }
  if (q) { where.push("name LIKE ?"); params.push(`%${q}%`); }

  const [rows] = await pool.query(
    `SELECT id, name FROM ${spec.table} WHERE ${where.join(" AND ")} ORDER BY name LIMIT 20`,
    params
  );
  return ok({ results: rows });
});
