import { getSession } from "@/lib/auth";
import { assertSuperAdmin } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { saveBrandingUpload } from "@/lib/helpers/brandingUpload";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertSuperAdmin(session);

  const formData = await request.formData();
  const file = formData.get("file");
  const category = formData.get("category");
  if (!file || typeof file === "string") return badRequest("No file provided.");

  const url = await saveBrandingUpload({ companyId: session.company_id, category, file });
  return ok({ url });
}));
