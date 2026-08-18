import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { getFullLeadFormLayout, upsertBuiltinFieldConfig } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return ok({ groups: [], schemaReady: false });
  return ok({ groups: await getFullLeadFormLayout(session), schemaReady: true });
});

export const PUT = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  if (!body.fieldKey) return badRequest("fieldKey is required.");
  await upsertBuiltinFieldConfig(session, body.fieldKey, body, session.id);
  return ok();
}));
