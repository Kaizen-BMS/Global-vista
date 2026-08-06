import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getActivityLogs } from "@/lib/activityLog";

export async function GET(request) {
  const session = await getSession();
  if (!(await hasPermission(session, "activity_logs.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const logs = await getActivityLogs({
    module: searchParams.get("module") || null,
    limit: Number(searchParams.get("limit")) || 50,
    offset: Number(searchParams.get("offset")) || 0,
  });
  return NextResponse.json({ logs });
}