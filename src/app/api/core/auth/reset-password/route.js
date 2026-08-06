import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { hashPassword, destroyAllSessions, createSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { checkPasswordComplexity } from "@/lib/helpers/passwordPolicy";
import { wasPasswordUsedBefore, recordPasswordHistory } from "@/lib/actions/passwordHistory";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ valid: false, reason: "missing" });
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  const [[user]] = await pool.query(`SELECT id, reset_token_expires_at FROM users WHERE reset_token = ? LIMIT 1`, [hashedToken]);
  if (!user) return NextResponse.json({ valid: false, reason: "invalid" });
  if (new Date(user.reset_token_expires_at) < new Date()) return NextResponse.json({ valid: false, reason: "expired" });
  return NextResponse.json({ valid: true });
}

export async function POST(request) {
  try {
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    const { valid, errors } = checkPasswordComplexity(password);
    if (!valid) return NextResponse.json({ error: "Password does not meet requirements.", errors }, { status: 400 });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const [[userRow]] = await pool.query(`SELECT id, company_id FROM users WHERE reset_token = ? AND reset_token_expires_at > NOW() LIMIT 1`, [hashedToken]);
    if (!userRow) return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
    if (await wasPasswordUsedBefore(userRow.id, password)) return NextResponse.json({ error: "You've used this password before." }, { status: 400 });

    const passwordHash = await hashPassword(password);
    await pool.query(`UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires_at = NULL, must_change_password = 0, failed_login_count = 0, locked_until = NULL WHERE id = ?`, [passwordHash, userRow.id]);
    await recordPasswordHistory(userRow.id, passwordHash);
    await destroyAllSessions(userRow.id);

    const [[fullUser]] = await pool.query(`SELECT u.*, r.slug AS role_slug FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ?`, [userRow.id]);
    const ip = request.headers.get("x-forwarded-for") || null;
    const ua = request.headers.get("user-agent") || null;
    await createSession(fullUser, { ipAddress: ip, userAgent: ua });
    await logActivity({ userId: userRow.id, module: "auth", action: "reset_password", entityType: "user", entityId: userRow.id, description: "Password reset via token", companyId: userRow.company_id });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}