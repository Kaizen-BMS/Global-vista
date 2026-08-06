import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { forbidden, withErrorHandling } from "@/lib/helpers/response";
import { SAMPLE_TEMPLATE_CSV } from "@/lib/constants/userImport";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "users.import"))) return forbidden();

  return new Response(SAMPLE_TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="user-import-template.csv"`,
    },
  });
});