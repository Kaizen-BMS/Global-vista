import { getSession } from "@/lib/auth";
import { ok, created, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listIdeas, createIdea } from "@/lib/actions/ideas";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || null;
  const scope = searchParams.get("scope") === "company" ? "company" : "mine";
  const ideas = await listIdeas(session, { status, scope });
  return ok({ ideas });
});

export const POST = withCsrf(withErrorHandling(async (request) => {
  const session = await getSession();
  const formData = await request.formData();
  const title = formData.get("title");
  const description = formData.get("description");
  if (!title || !description) return badRequest("Title and description are required.");
  const file = formData.get("file");

  const id = await createIdea(session, {
    title,
    category: formData.get("category"),
    description,
    priority: formData.get("priority"),
    visibility: formData.get("visibility"),
    file: file && typeof file !== "string" ? file : null,
  }, session.id);
  return created({ id });
}));
