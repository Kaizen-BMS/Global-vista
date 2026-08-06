import { NextResponse } from "next/server";
import { getSession, verifyPassword, hashPassword, destroyAllSessions } from "@/lib/auth";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { checkPasswordComplexity } from "@/lib/helpers/passwordPolicy";
import { wasPasswordUsedBefore, recordPasswordHistory } from "@/lib/actions/passwordHistory";
import { withCsrf } from "@/lib/helpers/withCsrf";

async function handler(request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { currentPassword, newPassword } = await request.json();
  const { valid, errors } = checkPasswordComplexity(newPassword);
  if (!valid) return NextResponse.json({ error: "Password does not meet requirements.", errors }, { status: 400 });

  const [[user]] = await pool.query(`SELECT password_hash, must_change_password FROM users WHERE id = ?`, [session.id]);
  if (!user.must_change_password) {
    if (!currentPassword) return NextResponse.json({ error: "Current password is required." }, { status: 400 });
    if (!(await verifyPassword(currentPassword, user.password_hash))) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }
  if (await wasPasswordUsedBefore(session.id, newPassword)) return NextResponse.json({ error: "You've used this password before." }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await pool.query(`UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?`, [passwordHash, session.id]);
  await recordPasswordHistory(session.id, passwordHash);
  await destroyAllSessions(session.id, session.jti);
  await logActivity({ userId: session.id, module: "auth", action: "change_password", entityType: "user", entityId: session.id, description: "Changed password", companyId: session.company_id });
  return NextResponse.json({ success: true });
}
export const POST = withCsrf(handler);