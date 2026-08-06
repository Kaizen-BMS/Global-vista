import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withErrorHandling } from "@/lib/helpers/response";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const { companyId } = await request.json();

  const res = NextResponse.json({ success: true });
  // Short-lived, explicit "I am viewing as" marker — read by Server
  // Components via cookies() when rendering /platform/companies/[id]
  // detail pages, never used to bypass a real session's own company_id
  // for any mutating write action.
  res.cookies.set("gv_operator_viewing_company", String(companyId), {
    httpOnly: true, sameSite: "lax", maxAge: 60 * 60, path: "/",
  });
  return res;
}));