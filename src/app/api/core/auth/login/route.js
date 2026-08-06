import { NextResponse } from "next/server";
import { getUserByEmail, verifyPassword, createSession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { recordLoginEvent } from "@/lib/actions/loginHistory";
import { isAccountLocked, recordFailedLogin, clearFailedLogins } from "@/lib/actions/accountLockout";
import { rateLimit } from "@/lib/helpers/rateLimit";
import { pool } from "@/lib/db";

export async function POST(request) {
  try {
    const { email, password, rememberMe } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const ua = request.headers.get("user-agent") || null;
    if (!rateLimit(`login:${ip}`, { max: 10, windowMs: 15 * 60 * 1000 }).allowed)
      return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
    if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user || user.status !== "active") return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    if (await isAccountLocked(user)) return NextResponse.json({ error: "Account locked. Try again in 15 minutes." }, { status: 423 });

    if (!(await verifyPassword(password, user.password_hash))) {
      await recordFailedLogin(user.id, user.company_id);
      await recordLoginEvent(user.id, "failed_login", { ipAddress: ip, userAgent: ua });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    await clearFailedLogins(user.id);
    await createSession(user, { ipAddress: ip, userAgent: ua, rememberMe: !!rememberMe });
    await pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);
    await recordLoginEvent(user.id, "login", { ipAddress: ip, userAgent: ua });
    await logActivity({ userId: user.id, module: "auth", action: "login", entityType: "user", entityId: user.id, description: `${user.name} logged in`, ipAddress: ip, companyId: user.company_id });

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role_slug, is_super_admin: !!user.is_super_admin, is_platform_operator: !!user.is_platform_operator, company_id: user.company_id },
      mustChangePassword: !!user.must_change_password,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}