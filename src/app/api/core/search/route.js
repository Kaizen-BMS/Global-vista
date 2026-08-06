import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return ok({ results: [] });
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return ok({ results: [] });
  const like = `%${q}%`;
  const [users] = await pool.query(`SELECT id, name, email FROM users WHERE is_deleted=0 AND company_id=? AND (name LIKE ? OR email LIKE ?) LIMIT 8`, [session.company_id, like, like]);
  return ok({ results: users.map((u) => ({ id: u.id, title: u.name, subtitle: u.email, href: `/workspace/users/${u.id}` })) });
});