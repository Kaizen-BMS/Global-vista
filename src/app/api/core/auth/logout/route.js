import { NextResponse } from "next/server";
import { getSession, destroySession } from "@/lib/auth";
import { logActivity } from "@/lib/activityLog";
import { withCsrf } from "@/lib/helpers/withCsrf";

async function handler() {
  const session = await getSession();
  await destroySession();
  if (session) await logActivity({ userId: session.id, module: "auth", action: "logout", entityType: "user", entityId: session.id, description: "Logged out", companyId: session.company_id });
  return NextResponse.json({ success: true });
}
export async function POST(request) {
  const session = await getSession();
  if (!session) { await destroySession(); return NextResponse.json({ success: true }); }
  return withCsrf(handler)(request);
}