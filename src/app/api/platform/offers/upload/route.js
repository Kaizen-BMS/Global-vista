import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { savePlatformUpload } from "@/lib/helpers/platformUpload";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return badRequest("No file provided.");

  const url = await savePlatformUpload({ category: "offer_banner", file });
  return ok({ url });
}));
