import { getSession } from "@/lib/auth";
import { ok, unauthorized, withErrorHandling } from "@/lib/helpers/response";
import { blockUser, unblockUser, getBlockStatus } from "@/lib/actions/messaging";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  const status = await getBlockStatus(session, Number(id));
  return ok(status);
});

export const POST = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  await blockUser(session, Number(id));
  return ok();
}));

export const DELETE = withCsrf(withErrorHandling(async (request, ctx) => {
  const session = await getSession();
  if (!session) return unauthorized();
  const { id } = await ctx.params;
  await unblockUser(session, Number(id));
  return ok();
}));
