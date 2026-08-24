import { getSession } from "@/lib/auth";
import { ok, withErrorHandling } from "@/lib/helpers/response";
import { updateOffer, deleteOffer } from "@/lib/platform/actions/offers";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  const data = await request.json();
  await updateOffer(session, id, data);
  return ok({ updated: true });
}));

export const DELETE = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  await deleteOffer(session, id);
  return ok({ deleted: true });
}));
