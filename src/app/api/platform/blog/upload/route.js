import { getSession } from "@/lib/auth";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { saveContentUpload } from "@/lib/helpers/contentUpload";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  assertPlatformOperator(session);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return badRequest("No file provided.");

  const url = await saveContentUpload({ category: "blog", file });
  return ok({ url });
}));
