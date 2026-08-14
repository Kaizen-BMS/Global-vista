import { getSession } from "@/lib/auth";
import { ok, created, badRequest, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { getConversationMessages, sendMessage } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const beforeId = searchParams.get("beforeId") || null;
  const messages = await getConversationMessages(session, id, { beforeId });
  return ok({ messages });
});

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;

  const contentType = request.headers.get("content-type") || "";
  let body, file;
  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    body = formData.get("body") || "";
    const f = formData.get("file");
    if (f && typeof f !== "string") file = f;
  } else {
    const json = await request.json();
    body = json.body;
  }
  if (!body?.trim() && !file) return badRequest("Message body or attachment is required.");

  const messageId = await sendMessage(session, id, { body, file }, session.id);
  return created({ id: messageId });
}));
