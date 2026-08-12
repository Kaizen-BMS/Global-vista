import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { pool } from "@/lib/db";
import { withCsrf } from "@/lib/helpers/withCsrf";
import { isValidTimeZone } from "@/lib/helpers/dateFormat";

const ALLOWED_GROUPS = ["general", "security", "authentication", "email", "storage", "logging", "backups", "queue", "api", "branding", "maintenance"];

export const GET = withErrorHandling(async (request, context) => {
  const { group } = await context.params;
  const session = await getSession();
  assertPlatformOperator(session);
  if (!ALLOWED_GROUPS.includes(group)) return ok({ settings: {} });
  const [rows] = await pool.query(`SELECT \`key\`, \`value\` FROM platform_settings WHERE \`group\` = ?`, [group]);
  return ok({ settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) });
});

export const PUT = withCsrf(withErrorHandling(async (request, context) => {
  const { group } = await context.params;
  const session = await getSession();
  assertPlatformOperator(session);
  if (!ALLOWED_GROUPS.includes(group)) {
    const err = new Error("Unknown settings group.");
    err.status = 400;
    throw err;
  }
  const body = await request.json();
  for (const [key, value] of Object.entries(body)) {
    if (key === "default_timezone" && !isValidTimeZone(value)) {
      return badRequest(`"${value}" is not a valid timezone.`);
    }
    await pool.query(
      `INSERT INTO platform_settings (\`key\`, \`value\`, \`group\`, updated_by) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`), updated_by = VALUES(updated_by)`,
      [key, String(value ?? ""), group, session.id]
    );
  }
  return ok();
}));