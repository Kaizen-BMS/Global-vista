import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { saveBrandingUpload } from "@/lib/helpers/brandingUpload";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  assertPlatformOperator(session);
  const { id } = await ctx.params;

  const formData = await request.formData();
  const file = formData.get("file");
  const category = formData.get("category");
  if (!file || typeof file === "string") return badRequest("No file provided.");

  const url = await saveBrandingUpload({ companyId: id, category, file });
  return ok({ url });
}));
