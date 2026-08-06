import { NextResponse } from "next/server";
import crypto from "crypto";
import { pool } from "@/lib/db";
import { getUserByEmail } from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/helpers/email";
import { logActivity } from "@/lib/activityLog";
import { rateLimit } from "@/lib/helpers/rateLimit";

export async function POST(request) {
  try {
    const { email } = await request.json();
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    if (!rateLimit(`forgot-password:${ip}`, { max: 5, windowMs: 15 * 60 * 1000 }).allowed) return NextResponse.json({ success: true });
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const user = await getUserByEmail(email.trim().toLowerCase());
    if (!user) return NextResponse.json({ success: true });

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    await pool.query(`UPDATE users SET reset_token = ?, reset_token_expires_at = ? WHERE id = ?`, [hashedToken, new Date(Date.now() + 1800000), user.id]);

    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
    await sendPasswordResetEmail({ to: user.email, userId: user.id, name: user.name, resetUrl: `${appUrl}/reset-password?token=${rawToken}`, companyId: user.company_id });
    await logActivity({ userId: user.id, module: "auth", action: "forgot_password_requested", entityType: "user", entityId: user.id, description: "Password reset requested", companyId: user.company_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    return NextResponse.json({ success: true });
  }
}