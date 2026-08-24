import { getSession } from "@/lib/auth";
import { ok, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { updateBlogPost, deleteBlogPost } from "@/lib/platform/actions/blog";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const PUT = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  const data = await request.json();
  if (!data.title) return badRequest("Title is required.");
  const result = await updateBlogPost(session, id, data);
  return ok(result);
}));

export const DELETE = withCsrf(withErrorHandling(async (request, { params }) => {
  const session = await getSession();
  const { id } = await params;
  await deleteBlogPost(session, id);
  return ok({ deleted: true });
}));
