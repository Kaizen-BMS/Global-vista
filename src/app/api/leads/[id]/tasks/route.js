import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import { listLeadTasks, createTask, toggleTaskComplete } from "@/lib/actions/leadTasks";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const tasks = await listLeadTasks(session, id);
  return ok({ tasks });
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { id } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.tasks.manage"))) return forbidden();
  const body = await request.json();
  if (body.action === "toggle") { await toggleTaskComplete(session, body.taskId, id, body.isCompleted, session.id); return ok(); }
  if (!body.title) return badRequest("Task title is required.");
  const taskId = await createTask(session, id, body, session.id);
  return created({ id: taskId });
}));