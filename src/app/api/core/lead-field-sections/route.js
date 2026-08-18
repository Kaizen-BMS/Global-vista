import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listFieldSections, createFieldSection, ensureDefaultSections } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadFormBuilderSchema } from "@/lib/db/schemaFlags";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return ok({ sections: [], schemaReady: false });
  await ensureDefaultSections(session, session.id);
  return ok({ sections: await listFieldSections(session), schemaReady: true });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!(await can(session, "settings.manage"))) return forbidden();
  if (!(await hasLeadFormBuilderSchema())) return badRequest("This feature is not yet available — a pending database migration must be applied first.");
  const body = await request.json();
  const id = await createFieldSection(session, body, session.id);
  return created({ id });
}));
