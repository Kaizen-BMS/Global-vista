import "server-only";
import { pool } from "@/lib/db";
import { logActivity } from "@/lib/activityLog";
import { createNotification } from "@/lib/actions/notifications";
import { getVisibleLeadFilter } from "@/lib/modules/crm/rls";
import { assertModuleEnabled } from "@/lib/platform/tenant";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "PayPal", "Card", "Other"];

function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }

function assertPositiveAmount(amount, label = "Amount") {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) { const e = new Error(`${label} must be a positive number.`); e.status = 400; throw e; }
  return round2(n);
}

// Same RLS every other lead-scoped query uses (getVisibleLeadFilter), not
// just a company_id check — a counsellor restricted to their own leads must
// not be able to create/view a payment plan against a lead assigned to
// someone else just because it's in the same company. Also the module gate:
// funnels through here so every entry point that resolves a lead picks it
// up automatically, without needing its own separate check.
async function assertLeadInCompany(conn, session, leadId) {
  await assertModuleEnabled(session.company_id, "payments");
  const { where, params } = await getVisibleLeadFilter(session);
  const [[lead]] = await conn.query(`SELECT l.id, l.name, l.lead_number, l.assigned_to FROM leads l WHERE l.id = ? AND l.is_deleted = 0 AND ${where}`, [leadId, ...params]);
  if (!lead) { const e = new Error("Lead not found or not visible to you."); e.status = 404; throw e; }
  return lead;
}

/**
 * Every payment-plan/installment/payment lookup re-verifies company_id
 * server-side, never trusts an id alone — the cross-company access guard
 * for every function below that takes a planId. Beyond company_id, it also
 * re-checks the plan's lead against the caller's own RLS scope (found via a
 * live test: fetching a plan by id alone let a same-company caller reach a
 * plan tied to a lead they otherwise can't see at all — same-company isn't
 * the only boundary that matters here, lead-level RLS is too).
 */
async function getOwnedPlan(conn, session, planId) {
  await assertModuleEnabled(session.company_id, "payments");
  const [[plan]] = await conn.query(`SELECT * FROM payment_plans WHERE id = ? AND company_id = ?`, [planId, session.company_id]);
  if (!plan) { const e = new Error("Payment plan not found in this company."); e.status = 404; throw e; }
  if (plan.lead_id) {
    const { where, params } = await getVisibleLeadFilter(session);
    const [[visible]] = await pool.query(`SELECT l.id FROM leads l WHERE l.id = ? AND l.is_deleted = 0 AND ${where}`, [plan.lead_id, ...params]);
    if (!visible) { const e = new Error("Payment plan not found in this company."); e.status = 404; throw e; }
  }
  return plan;
}

async function computePlanTotals(conn, planId) {
  const [[{ totalPaid }]] = await conn.query(`SELECT COALESCE(SUM(amount), 0) AS totalPaid FROM payments WHERE payment_plan_id = ?`, [planId]);
  const [[{ overdueAmount }]] = await conn.query(
    `SELECT COALESCE(SUM(amount - paid_amount), 0) AS overdueAmount FROM payment_installments
     WHERE payment_plan_id = ? AND status NOT IN ('Paid','Cancelled') AND due_date < CURDATE()`,
    [planId]
  );
  const [[nextInstallment]] = await conn.query(
    `SELECT id, amount, paid_amount, due_date FROM payment_installments
     WHERE payment_plan_id = ? AND status NOT IN ('Paid','Cancelled') ORDER BY due_date ASC LIMIT 1`,
    [planId]
  );
  return { totalPaid: round2(totalPaid), overdueAmount: round2(overdueAmount), nextInstallment: nextInstallment || null };
}

/** Recomputes and persists the plan's status from its actual payments —
 * never trust a caller-supplied status. Leaves Cancelled/Refunded alone:
 * those are terminal states set only by their own dedicated actions. */
async function recalculatePlanStatus(conn, plan) {
  if (["Cancelled", "Refunded"].includes(plan.status)) return plan.status;
  const { totalPaid, overdueAmount } = await computePlanTotals(conn, plan.id);
  let status;
  if (totalPaid >= Number(plan.total_payable)) status = "Paid";
  else if (totalPaid > 0) status = "Partially Paid";
  else if (overdueAmount > 0) status = "Overdue";
  else status = "Pending";
  await conn.query(`UPDATE payment_plans SET status = ? WHERE id = ?`, [status, plan.id]);
  return status;
}

function installmentStatus(amount, paidAmount, dueDate) {
  if (paidAmount >= amount) return "Paid";
  if (paidAmount > 0) return "Partially Paid";
  if (dueDate && new Date(`${dueDate}`) < new Date(new Date().toDateString())) return "Overdue";
  return "Pending";
}

export async function listPaymentPlansForLead(session, leadId) {
  await assertLeadInCompany(pool, session, leadId);
  const [plans] = await pool.query(
    `SELECT pp.*, s.name AS service_name, cu.name AS created_by_name
     FROM payment_plans pp
     JOIN services s ON s.id = pp.service_id
     LEFT JOIN users cu ON cu.id = pp.created_by
     WHERE pp.lead_id = ? AND pp.company_id = ? ORDER BY pp.created_at DESC`,
    [leadId, session.company_id]
  );
  const withTotals = await Promise.all(plans.map(async (plan) => {
    const totals = await computePlanTotals(pool, plan.id);
    return { ...plan, totalPaid: totals.totalPaid, remaining: round2(Number(plan.total_payable) - totals.totalPaid), overdueAmount: totals.overdueAmount, nextInstallment: totals.nextInstallment };
  }));
  return withTotals;
}

export async function getPaymentPlanDetail(session, planId) {
  const plan = await getOwnedPlan(pool, session, planId);
  const [[full]] = await pool.query(
    `SELECT pp.*, s.name AS service_name, cu.name AS created_by_name, uu.name AS updated_by_name,
            l.name AS lead_name, l.lead_number, l.phone AS lead_phone
     FROM payment_plans pp
     JOIN services s ON s.id = pp.service_id
     LEFT JOIN users cu ON cu.id = pp.created_by
     LEFT JOIN users uu ON uu.id = pp.updated_by
     LEFT JOIN leads l ON l.id = pp.lead_id
     WHERE pp.id = ?`,
    [plan.id]
  );
  const [installments] = await pool.query(`SELECT * FROM payment_installments WHERE payment_plan_id = ? ORDER BY sort_order ASC, due_date ASC`, [plan.id]);
  const [payments] = await pool.query(
    `SELECT p.*, u.name AS received_by_name, i.due_date AS installment_due_date
     FROM payments p LEFT JOIN users u ON u.id = p.received_by LEFT JOIN payment_installments i ON i.id = p.installment_id
     WHERE p.payment_plan_id = ? ORDER BY p.payment_date DESC, p.created_at DESC`,
    [plan.id]
  );
  const totals = await computePlanTotals(pool, plan.id);
  return {
    plan: full,
    installments,
    payments,
    totalPayable: Number(full.total_payable),
    totalPaid: totals.totalPaid,
    remaining: round2(Number(full.total_payable) - totals.totalPaid),
    overdueAmount: totals.overdueAmount,
    nextInstallment: totals.nextInstallment,
  };
}

/**
 * Negotiated amount is never trusted blind: if the caller doesn't supply an
 * explicit override, it's recomputed server-side as original - discount, so
 * the UI's live preview and what actually gets stored can never drift apart.
 */
export async function createPaymentPlan(session, leadId, data, createdBy) {
  const lead = await assertLeadInCompany(pool, session, leadId);
  const [[service]] = await pool.query(`SELECT id, name FROM services WHERE id = ? AND company_id = ? AND is_deleted = 0`, [data.serviceId, session.company_id]);
  if (!service) { const e = new Error("Service not found in this company."); e.status = 400; throw e; }

  const originalAmount = assertPositiveAmount(data.originalAmount, "Original amount");
  const discountAmount = data.discountAmount ? round2(Number(data.discountAmount)) : 0;
  if (discountAmount < 0) { const e = new Error("Discount cannot be negative."); e.status = 400; throw e; }
  if (discountAmount > originalAmount) { const e = new Error("Discount cannot exceed the original amount."); e.status = 400; throw e; }

  const negotiatedAmount = data.negotiatedAmount != null && data.negotiatedAmount !== ""
    ? assertPositiveAmount(data.negotiatedAmount, "Negotiated amount")
    : round2(originalAmount - discountAmount);

  const taxAmount = data.taxAmount ? round2(Number(data.taxAmount)) : 0;
  if (taxAmount < 0) { const e = new Error("Tax cannot be negative."); e.status = 400; throw e; }
  const totalPayable = round2(negotiatedAmount + taxAmount);

  const [result] = await pool.query(
    `INSERT INTO payment_plans (company_id, lead_id, service_id, original_amount, discount_amount, negotiated_amount, tax_amount, total_payable, currency, status, notes, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`,
    [session.company_id, leadId, data.serviceId, originalAmount, discountAmount, negotiatedAmount, taxAmount, totalPayable, data.currency || "INR", data.notes || null, createdBy, createdBy]
  );

  await logActivity({
    userId: createdBy, module: "leads", action: "payment_plan_created", entityType: "payment_plan", entityId: result.insertId, companyId: session.company_id,
    description: `Created payment plan for ${lead.name} — ${data.currency || "INR"} ${totalPayable}`,
    meta: { leadId, originalAmount, discountAmount, negotiatedAmount, taxAmount, totalPayable },
  });

  return result.insertId;
}

export async function addInstallment(session, planId, { amount, dueDate }, actorId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const plan = await getOwnedPlan(conn, session, planId);
    if (["Cancelled", "Refunded"].includes(plan.status)) { const e = new Error(`Cannot add an installment to a ${plan.status.toLowerCase()} plan.`); e.status = 400; throw e; }
    const amt = assertPositiveAmount(amount, "Installment amount");
    if (!dueDate) { const e = new Error("Due date is required."); e.status = 400; throw e; }

    const [[{ allocated }]] = await conn.query(`SELECT COALESCE(SUM(amount), 0) AS allocated FROM payment_installments WHERE payment_plan_id = ?`, [planId]);
    if (round2(Number(allocated) + amt) > Number(plan.total_payable) + 0.01) {
      const e = new Error(`Installments would total ${round2(Number(allocated) + amt)}, exceeding the plan's payable amount of ${plan.total_payable}.`);
      e.status = 400; throw e;
    }
    const [[{ maxOrder }]] = await conn.query(`SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM payment_installments WHERE payment_plan_id = ?`, [planId]);

    const [result] = await conn.query(
      `INSERT INTO payment_installments (company_id, payment_plan_id, amount, due_date, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
      [session.company_id, planId, amt, dueDate, installmentStatus(amt, 0, dueDate), Number(maxOrder) + 1]
    );
    await recalculatePlanStatus(conn, plan);
    await conn.commit();

    await logActivity({ userId: actorId, module: "leads", action: "payment_installment_created", entityType: "payment_plan", entityId: planId, companyId: session.company_id, description: `Added installment of ${plan.currency} ${amt} due ${dueDate}` });
    return result.insertId;
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function updateInstallment(session, planId, installmentId, { amount, dueDate }, actorId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const plan = await getOwnedPlan(conn, session, planId);
    const [[inst]] = await conn.query(`SELECT * FROM payment_installments WHERE id = ? AND payment_plan_id = ? AND company_id = ?`, [installmentId, planId, session.company_id]);
    if (!inst) { const e = new Error("Installment not found."); e.status = 404; throw e; }
    if (Number(inst.paid_amount) > 0) { const e = new Error("Cannot edit an installment that already has payments recorded against it."); e.status = 400; throw e; }

    const amt = amount != null ? assertPositiveAmount(amount, "Installment amount") : Number(inst.amount);
    const due = dueDate || inst.due_date;

    const [[{ allocated }]] = await conn.query(`SELECT COALESCE(SUM(amount), 0) AS allocated FROM payment_installments WHERE payment_plan_id = ? AND id != ?`, [planId, installmentId]);
    if (round2(Number(allocated) + amt) > Number(plan.total_payable) + 0.01) {
      const e = new Error(`Installments would total ${round2(Number(allocated) + amt)}, exceeding the plan's payable amount of ${plan.total_payable}.`);
      e.status = 400; throw e;
    }

    await conn.query(`UPDATE payment_installments SET amount = ?, due_date = ?, status = ? WHERE id = ?`, [amt, due, installmentStatus(amt, 0, due), installmentId]);
    await recalculatePlanStatus(conn, plan);
    await conn.commit();
    await logActivity({ userId: actorId, module: "leads", action: "payment_installment_updated", entityType: "payment_plan", entityId: planId, companyId: session.company_id, description: `Updated installment #${installmentId}` });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function removeInstallment(session, planId, installmentId, actorId) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const plan = await getOwnedPlan(conn, session, planId);
    const [[inst]] = await conn.query(`SELECT * FROM payment_installments WHERE id = ? AND payment_plan_id = ? AND company_id = ?`, [installmentId, planId, session.company_id]);
    if (!inst) { const e = new Error("Installment not found."); e.status = 404; throw e; }
    if (Number(inst.paid_amount) > 0) { const e = new Error("Cannot remove an installment that already has payments recorded against it."); e.status = 400; throw e; }

    await conn.query(`DELETE FROM payment_installments WHERE id = ?`, [installmentId]);
    await recalculatePlanStatus(conn, plan);
    await conn.commit();
    await logActivity({ userId: actorId, module: "leads", action: "payment_installment_removed", entityType: "payment_plan", entityId: planId, companyId: session.company_id, description: `Removed installment #${installmentId}` });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

/**
 * The one place money actually moves. Runs inside a single transaction
 * with a row lock on the plan (`FOR UPDATE`) so two concurrent payment
 * submissions against the same plan can never both pass the overpayment
 * check and jointly overshoot the balance — the second one re-reads the
 * now-updated total inside its own lock wait, not a stale snapshot.
 */
export async function recordPayment(session, planId, data, actorId) {
  if (!PAYMENT_METHODS.includes(data.method)) { const e = new Error("Invalid payment method."); e.status = 400; throw e; }
  const amount = assertPositiveAmount(data.amount, "Payment amount");
  if (!data.paymentDate) { const e = new Error("Payment date is required."); e.status = 400; throw e; }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [[plan]] = await conn.query(`SELECT * FROM payment_plans WHERE id = ? AND company_id = ? FOR UPDATE`, [planId, session.company_id]);
    if (!plan) { const e = new Error("Payment plan not found in this company."); e.status = 404; throw e; }
    if (["Cancelled", "Refunded"].includes(plan.status)) { const e = new Error(`Cannot record a payment against a ${plan.status.toLowerCase()} plan.`); e.status = 400; throw e; }

    const { totalPaid: planPaidSoFar } = await computePlanTotals(conn, planId);
    const planRemaining = round2(Number(plan.total_payable) - planPaidSoFar);
    if (amount > planRemaining + 0.01) {
      const e = new Error(`This payment of ${amount} would exceed the outstanding balance of ${planRemaining}. Overpayment is not supported.`);
      e.status = 400; throw e;
    }

    let installment = null;
    if (data.installmentId) {
      const [[inst]] = await conn.query(`SELECT * FROM payment_installments WHERE id = ? AND payment_plan_id = ? AND company_id = ? FOR UPDATE`, [data.installmentId, planId, session.company_id]);
      if (!inst) { const e = new Error("Installment not found."); e.status = 404; throw e; }
      const instRemaining = round2(Number(inst.amount) - Number(inst.paid_amount));
      if (amount > instRemaining + 0.01) {
        const e = new Error(`This payment of ${amount} would exceed this installment's outstanding balance of ${instRemaining}.`);
        e.status = 400; throw e;
      }
      installment = inst;
    }

    if (data.referenceId) {
      const [[dup]] = await conn.query(`SELECT id FROM payments WHERE company_id = ? AND reference_id = ? LIMIT 1`, [session.company_id, data.referenceId]);
      if (dup) { const e = new Error(`Reference/transaction ID "${data.referenceId}" has already been recorded.`); e.status = 409; throw e; }
    }

    const [result] = await conn.query(
      `INSERT INTO payments (company_id, payment_plan_id, installment_id, amount, currency, payment_method, reference_id, payment_date, received_by, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [session.company_id, planId, installment?.id || null, amount, plan.currency, data.method, data.referenceId || null, data.paymentDate, actorId, data.notes || null, actorId]
    );

    if (installment) {
      const newPaid = round2(Number(installment.paid_amount) + amount);
      await conn.query(`UPDATE payment_installments SET paid_amount = ?, status = ? WHERE id = ?`, [newPaid, installmentStatus(Number(installment.amount), newPaid, installment.due_date), installment.id]);
    }

    await conn.query(`UPDATE payment_plans SET updated_by = ? WHERE id = ?`, [actorId, planId]);
    const newStatus = await recalculatePlanStatus(conn, plan);
    await conn.commit();

    const [[lead]] = await pool.query(`SELECT id, name, lead_number, assigned_to FROM leads WHERE id = ?`, [plan.lead_id]);
    await logActivity({
      userId: actorId, module: "leads", action: "payment_recorded", entityType: "payment_plan", entityId: planId, companyId: session.company_id,
      description: `Recorded ${data.method} payment of ${plan.currency} ${amount} for ${lead?.name || `lead #${plan.lead_id}`}${data.referenceId ? ` (ref ${data.referenceId})` : ""}`,
      meta: { paymentId: result.insertId, amount, method: data.method, installmentId: installment?.id || null },
    });
    if (lead?.assigned_to && lead.assigned_to !== actorId) {
      await createNotification(session.company_id, lead.assigned_to, {
        title: "Payment received", message: `${plan.currency} ${amount} received for ${lead.name}`, type: "payment_received", link: `/workspace/lead-management/${plan.lead_id}`,
      });
    }

    return { paymentId: result.insertId, planStatus: newStatus };
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

export async function cancelPaymentPlan(session, planId, reason, actorId) {
  const plan = await getOwnedPlan(pool, session, planId);
  if (["Cancelled", "Refunded"].includes(plan.status)) { const e = new Error(`Plan is already ${plan.status}.`); e.status = 400; throw e; }
  await pool.query(`UPDATE payment_plans SET status = 'Cancelled', updated_by = ? WHERE id = ?`, [actorId, planId]);
  await logActivity({ userId: actorId, module: "leads", action: "payment_plan_cancelled", entityType: "payment_plan", entityId: planId, companyId: session.company_id, description: `Cancelled payment plan${reason ? `: ${reason}` : ""}` });
}

/**
 * Marks the plan Refunded without touching a single row in `payments` —
 * the recorded transactions stay exactly as they happened (per the "never
 * overwrite financial history" requirement); this is a status/audit-trail
 * action layered on top, not a mutation of the ledger.
 */
export async function refundPaymentPlan(session, planId, reason, actorId) {
  const plan = await getOwnedPlan(pool, session, planId);
  if (plan.status === "Refunded") { const e = new Error("Plan is already Refunded."); e.status = 400; throw e; }
  await pool.query(`UPDATE payment_plans SET status = 'Refunded', updated_by = ? WHERE id = ?`, [actorId, planId]);
  await logActivity({ userId: actorId, module: "leads", action: "payment_plan_refunded", entityType: "payment_plan", entityId: planId, companyId: session.company_id, description: `Marked payment plan as refunded${reason ? `: ${reason}` : ""}` });
}

export async function getPaymentReceipt(session, paymentId) {
  await assertModuleEnabled(session.company_id, "payments");
  const [[payment]] = await pool.query(
    `SELECT p.*, pp.total_payable, pp.currency AS plan_currency, pp.lead_id, pp.student_id,
            s.name AS service_name, l.name AS lead_name, l.lead_number,
            recv.name AS received_by_name
     FROM payments p
     JOIN payment_plans pp ON pp.id = p.payment_plan_id
     JOIN services s ON s.id = pp.service_id
     LEFT JOIN leads l ON l.id = pp.lead_id
     LEFT JOIN users recv ON recv.id = p.received_by
     WHERE p.id = ? AND p.company_id = ?`,
    [paymentId, session.company_id]
  );
  if (!payment) { const e = new Error("Payment not found in this company."); e.status = 404; throw e; }
  const { totalPaid } = await computePlanTotals(pool, payment.payment_plan_id);
  await logActivity({ userId: session.id, module: "leads", action: "payment_receipt_generated", entityType: "payment_plan", entityId: payment.payment_plan_id, companyId: session.company_id, description: `Generated receipt for payment #${paymentId}` });
  return { payment, totalPaid: round2(totalPaid), remaining: round2(Number(payment.total_payable) - totalPaid) };
}

/** RLS-consistent with the Leads list: an employee's dashboard only totals
 * payments for leads they're allowed to see (same getVisibleLeadFilter
 * every other lead-scoped query already uses); a Super Admin's query
 * naturally becomes company-wide since that filter already widens for them. */
export async function getEmployeePaymentDashboard(session) {
  await assertModuleEnabled(session.company_id, "payments");
  const { where, params } = await getVisibleLeadFilter(session);
  const base = `FROM payments p JOIN payment_plans pp ON pp.id = p.payment_plan_id JOIN leads l ON l.id = pp.lead_id AND l.is_deleted = 0 AND ${where}`;

  const [[todayCollections]] = await pool.query(`SELECT COALESCE(SUM(p.amount),0) AS total ${base} WHERE p.payment_date = CURDATE()`, params);
  const [[monthCollections]] = await pool.query(`SELECT COALESCE(SUM(p.amount),0) AS total ${base} WHERE p.payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`, params);

  const planBase = `FROM payment_plans pp JOIN leads l ON l.id = pp.lead_id AND l.is_deleted = 0 AND ${where}`;
  const [[pending]] = await pool.query(
    `SELECT COALESCE(SUM(pp.total_payable - COALESCE((SELECT SUM(amount) FROM payments WHERE payment_plan_id = pp.id), 0)), 0) AS total
     ${planBase} WHERE pp.status IN ('Pending','Partially Paid','Overdue')`, params
  );
  const [[overdue]] = await pool.query(
    `SELECT COALESCE(SUM(pi.amount - pi.paid_amount), 0) AS total FROM payment_installments pi
     JOIN payment_plans pp ON pp.id = pi.payment_plan_id JOIN leads l ON l.id = pp.lead_id AND l.is_deleted = 0 AND ${where}
     WHERE pi.status NOT IN ('Paid','Cancelled') AND pi.due_date < CURDATE()`, params
  );
  const [recentPayments] = await pool.query(
    `SELECT p.id, p.amount, p.currency, p.payment_method, p.payment_date, l.name AS lead_name, l.id AS lead_id
     ${base} ORDER BY p.created_at DESC LIMIT 8`, params
  );

  return {
    todayCollections: round2(todayCollections.total),
    monthCollections: round2(monthCollections.total),
    pendingAmount: round2(pending.total),
    overdueAmount: round2(overdue.total),
    recentPayments,
  };
}

export async function getSuperAdminPaymentDashboard(session) {
  await assertModuleEnabled(session.company_id, "payments");
  const companyWhere = `pp.company_id = ?`;
  const params = [session.company_id];

  const [[revenue]] = await pool.query(`SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN payment_plans pp ON pp.id = p.payment_plan_id WHERE ${companyWhere}`, params);
  const [[today]] = await pool.query(`SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN payment_plans pp ON pp.id = p.payment_plan_id WHERE ${companyWhere} AND p.payment_date = CURDATE()`, params);
  const [[month]] = await pool.query(`SELECT COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN payment_plans pp ON pp.id = p.payment_plan_id WHERE ${companyWhere} AND p.payment_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`, params);
  const [[outstanding]] = await pool.query(
    `SELECT COALESCE(SUM(pp.total_payable - COALESCE((SELECT SUM(amount) FROM payments WHERE payment_plan_id = pp.id), 0)), 0) AS total
     FROM payment_plans pp WHERE ${companyWhere} AND pp.status IN ('Pending','Partially Paid','Overdue')`, params
  );
  const [[overdue]] = await pool.query(
    `SELECT COALESCE(SUM(pi.amount - pi.paid_amount), 0) AS total FROM payment_installments pi JOIN payment_plans pp ON pp.id = pi.payment_plan_id
     WHERE ${companyWhere.replace("pp.", "pp.")} AND pi.status NOT IN ('Paid','Cancelled') AND pi.due_date < CURDATE()`, params
  );
  const [[statusCounts]] = await pool.query(
    `SELECT SUM(status='Paid') AS paidCount, SUM(status='Partially Paid') AS partialCount FROM payment_plans pp WHERE ${companyWhere}`, params
  );
  const [byService] = await pool.query(
    `SELECT s.name AS service, COALESCE(SUM(p.amount),0) AS total FROM payments p
     JOIN payment_plans pp ON pp.id = p.payment_plan_id JOIN services s ON s.id = pp.service_id
     WHERE ${companyWhere} GROUP BY s.id ORDER BY total DESC LIMIT 8`, params
  );
  const [byMethod] = await pool.query(
    `SELECT p.payment_method AS method, COALESCE(SUM(p.amount),0) AS total FROM payments p JOIN payment_plans pp ON pp.id = p.payment_plan_id
     WHERE ${companyWhere} GROUP BY p.payment_method ORDER BY total DESC`, params
  );
  const [byEmployee] = await pool.query(
    `SELECT u.name AS employee, COALESCE(SUM(p.amount),0) AS total FROM payments p
     JOIN payment_plans pp ON pp.id = p.payment_plan_id LEFT JOIN users u ON u.id = p.received_by
     WHERE ${companyWhere} GROUP BY p.received_by ORDER BY total DESC LIMIT 8`, params
  );

  return {
    totalRevenue: round2(revenue.total),
    todayCollections: round2(today.total),
    monthCollections: round2(month.total),
    outstanding: round2(outstanding.total),
    overdue: round2(overdue.total),
    paidPlans: Number(statusCounts.paidCount || 0),
    partiallyPaidPlans: Number(statusCounts.partialCount || 0),
    byService, byMethod, byEmployee,
  };
}

export { PAYMENT_METHODS };
