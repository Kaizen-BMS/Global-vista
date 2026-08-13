import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { ok, created, forbidden, badRequest, withErrorHandling } from "@/lib/helpers/response";
import {
  getPaymentPlanDetail, addInstallment, updateInstallment, removeInstallment,
  recordPayment, cancelPaymentPlan, refundPaymentPlan,
} from "@/lib/modules/crm/actions/payments";
import { withCsrf } from "@/lib/helpers/withCsrf";

export const GET = withErrorHandling(async (request, context) => {
  const { planId } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return forbidden();
  const detail = await getPaymentPlanDetail(session, planId);
  return ok(detail);
});

export const POST = withCsrf(withErrorHandling(async (request, context) => {
  const { planId } = await context.params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return forbidden();
  const body = await request.json();

  switch (body.action) {
    case "addInstallment": {
      if (!body.amount || !body.dueDate) return badRequest("Amount and due date are required.");
      const id = await addInstallment(session, planId, body, session.id);
      return created({ id });
    }
    case "updateInstallment": {
      if (!body.installmentId) return badRequest("installmentId is required.");
      await updateInstallment(session, planId, body.installmentId, body, session.id);
      return ok();
    }
    case "removeInstallment": {
      if (!body.installmentId) return badRequest("installmentId is required.");
      await removeInstallment(session, planId, body.installmentId, session.id);
      return ok();
    }
    case "recordPayment": {
      if (!body.amount || !body.method || !body.paymentDate) return badRequest("Amount, method, and payment date are required.");
      const result = await recordPayment(session, planId, body, session.id);
      return created(result);
    }
    case "cancel": {
      await cancelPaymentPlan(session, planId, body.reason, session.id);
      return ok();
    }
    case "refund": {
      await refundPaymentPlan(session, planId, body.reason, session.id);
      return ok();
    }
    default:
      return badRequest("Unknown action.");
  }
}));
