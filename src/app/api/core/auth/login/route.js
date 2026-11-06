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
    // Captured before the UPDATE below overwrites it — NULL here means this
    // is genuinely this user's first successful login ever, no separate
    // "onboarding done" column needed.
    const isFirstLogin = !user.last_login_at;
    if (await isAccountLocked(user)) return NextResponse.json({ error: "Account locked. Try again in 15 minutes." }, { status: 423 });

    // company_status now comes straight off the getUserByEmail row (a
    // LEFT JOIN there) instead of a second round trip here.
    if (user.company_id && !user.is_platform_operator && ["suspended", "deleted"].includes(user.company_status)) {
      return NextResponse.json({ error: "Your company account has been suspended. Please contact KaizenBMS Support.", code: "COMPANY_SUSPENDED" }, { status: 403 });
    }

    if (!(await verifyPassword(password, user.password_hash))) {
      await recordFailedLogin(user.id, user.company_id);
      await recordLoginEvent(user.id, "failed_login", { ipAddress: ip, userAgent: ua });
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    // createSession has to happen before the response goes out (it sets
    // the cookie), but nothing below depends on ITS result or on each
    // OTHER's — these used to run one after another, each one a full
    // round trip to a remote/shared DB host that's already slow on its
    // own (see db.js's own comment on why the pool is small); running
    // them concurrently instead cuts login latency roughly proportional
    // to how many of these there are. Skips the failed-login reset
    // entirely when there was nothing to reset (the common case for an
    // account that's never had a failed attempt).
    await Promise.all([
      createSession(user, { ipAddress: ip, userAgent: ua, rememberMe: !!rememberMe }),
      user.failed_login_count ? clearFailedLogins(user.id) : null,
      pool.query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]),
      recordLoginEvent(user.id, "login", { ipAddress: ip, userAgent: ua }),
      logActivity({ userId: user.id, module: "auth", action: "login", entityType: "user", entityId: user.id, description: `${user.name} logged in`, ipAddress: ip, companyId: user.company_id }),
    ]);

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role_slug, is_super_admin: !!user.is_super_admin, is_platform_operator: !!user.is_platform_operator, company_id: user.company_id },
      mustChangePassword: !!user.must_change_password,
      isFirstLogin,
    });
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}