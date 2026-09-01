import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { updatePartner, deletePartner } from "@/lib/platform/actions/partners";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  const data = await request.json();
  await updatePartner(session, id, data);
  return ok({ updated: true });
}));

export const DELETE = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  await deletePartner(session, id);
  return ok({ deleted: true });
}));
