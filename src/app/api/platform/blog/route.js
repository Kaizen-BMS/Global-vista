import { getSession } from "@/lib/auth";
import { ok, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listBlogPostsForAdmin, createBlogPost } from "@/lib/platform/actions/blog";
import { assertPlatformOperator } from "@/lib/helpers/permissions";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async () => {
  const session = await getSession();
  assertPlatformOperator(session);
  const posts = await listBlogPostsForAdmin();
  return ok({ posts });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return forbidden();
  const data = await request.json();
  if (!data.title) return badRequest("Title is required.");
  const result = await createBlogPost(session, data);
  return ok(result, 201);
}));
