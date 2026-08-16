"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Receipt, XCircle, RotateCcw, Loader2, X, CreditCard, CalendarPlus } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDate } from "@/lib/helpers/dateFormat";
import { formatMoney } from "@/lib/helpers/formatCurrency";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

const STATUS_STYLES = {
  Draft: "bg-muted/20 text-muted-foreground border-border/30",
  Pending: "bg-sky-500/10 text-sky-400 border-sky-500/30",
  "Partially Paid": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Paid: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Overdue: "bg-red-500/10 text-red-400 border-red-500/30",
  Cancelled: "bg-muted/20 text-muted-foreground border-border/30",
  Refunded: "bg-violet-500/10 text-violet-400 border-violet-500/30",
};
function StatusPill({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs border shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.Pending}`}>{status}</span>;
}
function SummaryStat({ label, value, accent = "neutral" }) {
  const colors = { neutral: "text-foreground", green: "text-emerald-400", yellow: "text-amber-400", red: "text-red-400" };
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      <p className={`text-sm font-semibold tabular-nums ${colors[accent]}`}>{value}</p>
    </div>
  );
}

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, children }) { return (<div><label className="block text-xs text-muted-foreground mb-1.5">{label}</label>{children}</div>); }
function ModalShell({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">{title}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreatePlanModal({ leadId, services, onClose, onDone, call }) {
  const [form, setForm] = useState({ serviceId: services[0]?.id || "", originalAmount: "", discountAmount: "", negotiatedAmount: "", taxAmount: "", currency: "INR", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const original = Number(form.originalAmount) || 0;
  const discount = Number(form.discountAmount) || 0;
  const computedNegotiated = Math.max(0, original - discount);
  const negotiated = form.negotiatedAmount !== "" ? Number(form.negotiatedAmount) || 0 : computedNegotiated;
  const tax = Number(form.taxAmount) || 0;
  const totalPayable = negotiated + tax;

  async function submit(e) {
    e.preventDefault();
    if (!form.serviceId) return toast.error("Select a service.");
    if (original <= 0) return toast.error("Enter the original amount.");
    setSaving(true);
    try {
      await call(`/api/leads/${leadId}/payments`, form);
      toast.success("Payment plan created.");
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Create Payment Plan" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Service *">
          <select required value={form.serviceId} onChange={(e) => set("serviceId", e.target.value)} className={inputClass}>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Original Amount *"><input required type="number" min="0" step="0.01" value={form.originalAmount} onChange={(e) => set("originalAmount", e.target.value)} className={inputClass} /></Field>
          <Field label="Currency"><input value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} className={inputClass} maxLength={10} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount"><input type="number" min="0" step="0.01" value={form.discountAmount} onChange={(e) => set("discountAmount", e.target.value)} className={inputClass} /></Field>
          <Field label="Tax"><input type="number" min="0" step="0.01" value={form.taxAmount} onChange={(e) => set("taxAmount", e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label={`Negotiated / Final Amount — leave blank to use Original − Discount (${computedNegotiated.toFixed(2)})`}>
          <input type="number" min="0" step="0.01" value={form.negotiatedAmount} onChange={(e) => set("negotiatedAmount", e.target.value)} placeholder={computedNegotiated.toFixed(2)} className={inputClass} />
        </Field>
        <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputClass} /></Field>
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-sm">
          <span className="text-muted-foreground">Total Payable</span>
          <span className="text-foreground font-semibold">{formatMoney(totalPayable, form.currency)}</span>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Plan</button>
        </div>
      </form>
    </ModalShell>
  );
}

function InstallmentModal({ leadId, planId, remaining, currency, onClose, onDone, call }) {
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await call(`/api/leads/${leadId}/payments/${planId}`, { action: "addInstallment", amount, dueDate });
      toast.success("Installment added.");
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Add Installment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-muted-foreground text-xs">Outstanding on this plan: {formatMoney(remaining, currency)}</p>
        <Field label="Amount *"><input required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} /></Field>
        <Field label="Due Date *"><input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={inputClass} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Add</button>
        </div>
      </form>
    </ModalShell>
  );
}

function RecordPaymentModal({ leadId, planId, installments, remaining, currency, availableMethods, onClose, onDone, call }) {
  const payableInstallments = installments.filter((i) => !["Paid", "Cancelled"].includes(i.status));
  const [form, setForm] = useState({ amount: "", method: availableMethods[0] || "Cash", installmentId: "", paymentDate: new Date().toISOString().slice(0, 10), referenceId: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await call(`/api/leads/${leadId}/payments/${planId}`, { action: "recordPayment", ...form, installmentId: form.installmentId || null });
      toast.success("Payment recorded.");
      onDone();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Record Payment" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <p className="text-muted-foreground text-xs">Outstanding on this plan: {formatMoney(remaining, currency)}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount *"><input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set("amount", e.target.value)} className={inputClass} /></Field>
          <Field label="Payment Date *"><input required type="date" value={form.paymentDate} onChange={(e) => set("paymentDate", e.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Method *">
          <select required value={form.method} onChange={(e) => set("method", e.target.value)} className={inputClass}>
            {availableMethods.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        {payableInstallments.length > 0 && (
          <Field label="Apply to Installment (optional)">
            <select value={form.installmentId} onChange={(e) => set("installmentId", e.target.value)} className={inputClass}>
              <option value="">Apply to plan directly</option>
              {payableInstallments.map((i) => <option key={i.id} value={i.id}>{formatMoney(Number(i.amount) - Number(i.paid_amount), currency)} remaining — due {i.due_date}</option>)}
            </select>
          </Field>
        )}
        <Field label="Reference / Transaction ID"><input value={form.referenceId} onChange={(e) => set("referenceId", e.target.value)} className={inputClass} placeholder="Optional" /></Field>
        <Field label="Notes"><textarea rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} className={inputClass} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Record Payment</button>
        </div>
      </form>
    </ModalShell>
  );
}

function ConfirmModal({ title, body, confirmLabel, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function confirm() {
    setSaving(true);
    try { await onConfirm(reason); } catch (err) { toast.error(err.message); setSaving(false); }
  }
  return (
    <ModalShell title={title} onClose={onClose}>
      <p className="text-muted-foreground text-sm mb-3">{body}</p>
      <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" className={`${inputClass} mb-4`} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Back</button>
        <button type="button" onClick={confirm} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

export default function LeadPayments({ leadId, plans, activePlan, services, availableMethods, canManage }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [modal, setModal] = useState(null);

  async function call(url, body) {
    const res = await apiFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Something went wrong.");
    return data;
  }
  function close() { setModal(null); router.refresh(); refreshSidebarBadges(); }

  if (!activePlan) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center">
        <p className="text-foreground font-medium mb-1">No payment plan yet</p>
        <p className="text-muted-foreground text-sm mb-4">Create one to start tracking fees, installments and payments for this lead.</p>
        {canManage && (
          <button onClick={() => setModal("createPlan")} className="btn-brand inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer">
            <Plus className="h-4 w-4" /> Create Payment Plan
          </button>
        )}
        {modal === "createPlan" && <CreatePlanModal leadId={leadId} services={services} onClose={() => setModal(null)} onDone={close} call={call} />}
      </div>
    );
  }

  const { plan, installments, payments, totalPayable, totalPaid, remaining, overdueAmount, nextInstallment } = activePlan;
  const currency = plan.currency;
  const isTerminal = ["Cancelled", "Refunded"].includes(plan.status);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2"><p className="text-foreground font-medium">Payment Plan</p><StatusPill status={plan.status} /></div>
          {canManage && !isTerminal && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setModal("record")} disabled={remaining <= 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-brand text-white text-xs font-medium cursor-pointer disabled:opacity-50"><CreditCard className="h-3.5 w-3.5" /> Record Payment</button>
              <button onClick={() => setModal("installment")} disabled={remaining <= 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs cursor-pointer disabled:opacity-50"><CalendarPlus className="h-3.5 w-3.5" /> Add Installment</button>
              <button onClick={() => setModal("cancel")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-red-400 text-xs cursor-pointer"><XCircle className="h-3.5 w-3.5" /> Cancel Plan</button>
              {plan.status === "Paid" && <button onClick={() => setModal("refund")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-violet-400 text-xs cursor-pointer"><RotateCcw className="h-3.5 w-3.5" /> Mark Refunded</button>}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <SummaryStat label="Total Payable" value={formatMoney(totalPayable, currency)} />
          <SummaryStat label="Total Paid" value={formatMoney(totalPaid, currency)} accent="green" />
          <SummaryStat label="Remaining" value={formatMoney(remaining, currency)} accent={remaining > 0 ? "yellow" : "neutral"} />
          <SummaryStat label="Overdue" value={formatMoney(overdueAmount, currency)} accent={overdueAmount > 0 ? "red" : "neutral"} />
        </div>

        {nextInstallment && (
          <p className="text-muted-foreground text-xs mb-3">
            Next due: {formatMoney(Number(nextInstallment.amount) - Number(nextInstallment.paid_amount), currency)} on {formatDate(nextInstallment.due_date, timezone)}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
          <div><span className="block text-foreground text-sm">{formatMoney(plan.original_amount, currency)}</span>Original</div>
          <div><span className="block text-foreground text-sm">{formatMoney(plan.discount_amount, currency)}</span>Discount</div>
          <div><span className="block text-foreground text-sm">{formatMoney(plan.negotiated_amount, currency)}</span>Negotiated</div>
          <div><span className="block text-foreground text-sm">{formatMoney(plan.tax_amount, currency)}</span>Tax</div>
        </div>
        {plan.notes && <p className="text-muted-foreground text-xs mt-3">{plan.notes}</p>}
        <p className="text-muted-foreground text-[11px] mt-3">Service: {plan.service_name} · Created by {plan.created_by_name || "—"}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground font-medium mb-3">Installments</p>
        {installments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No installments — the full amount is payable directly.</p>
        ) : (
          <div className="space-y-2">
            {installments.map((inst) => (
              <div key={inst.id} className="flex items-center justify-between gap-3 bg-muted/30 border border-border rounded-lg p-3">
                <div className="min-w-0">
                  <p className="text-foreground text-sm">{formatMoney(inst.amount, currency)}</p>
                  <p className="text-muted-foreground text-xs">Due {formatDate(inst.due_date, timezone)}{Number(inst.paid_amount) > 0 ? ` · ${formatMoney(inst.paid_amount, currency)} paid` : ""}</p>
                </div>
                <StatusPill status={inst.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground font-medium mb-3">Payment History</p>
        {payments.length === 0 ? (
          <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs border-b border-border">
                  <th className="py-2 pr-3 font-normal">Date</th><th className="py-2 pr-3 font-normal">Amount</th><th className="py-2 pr-3 font-normal">Method</th>
                  <th className="py-2 pr-3 font-normal">Reference</th><th className="py-2 pr-3 font-normal">Received By</th><th className="py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                    <td className="py-2 pr-3 text-foreground whitespace-nowrap">{formatDate(p.payment_date, timezone)}</td>
                    <td className="py-2 pr-3 text-foreground whitespace-nowrap">{formatMoney(p.amount, p.currency)}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.payment_method}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.reference_id || "—"}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{p.received_by_name || "—"}</td>
                    <td className="py-2">
                      <a href={`/workspace/lead-management/${leadId}/payments/${p.id}/receipt`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-xs cursor-pointer whitespace-nowrap">
                        <Receipt className="h-3.5 w-3.5" /> Receipt
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {plans.length > 1 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <p className="text-foreground font-medium mb-3">Other Plans for This Lead</p>
          <div className="space-y-2">
            {plans.filter((p) => p.id !== plan.id).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm bg-muted/30 border border-border rounded-lg p-3">
                <span className="text-foreground">{formatMoney(p.total_payable, p.currency)} — {p.service_name}</span>
                <StatusPill status={p.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {canManage && isTerminal && (
        <button onClick={() => setModal("createPlan")} className="flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> Start a new payment plan
        </button>
      )}

      {modal === "createPlan" && <CreatePlanModal leadId={leadId} services={services} onClose={() => setModal(null)} onDone={close} call={call} />}
      {modal === "installment" && <InstallmentModal leadId={leadId} planId={plan.id} remaining={remaining} currency={currency} onClose={() => setModal(null)} onDone={close} call={call} />}
      {modal === "record" && (
        <RecordPaymentModal leadId={leadId} planId={plan.id} installments={installments} remaining={remaining} currency={currency} availableMethods={availableMethods} onClose={() => setModal(null)} onDone={close} call={call} />
      )}
      {modal === "cancel" && (
        <ConfirmModal
          title="Cancel this payment plan?" confirmLabel="Cancel Plan"
          body="This won't delete any recorded payments, but no further payments can be recorded against it."
          onClose={() => setModal(null)}
          onConfirm={async (reason) => { await call(`/api/leads/${leadId}/payments/${plan.id}`, { action: "cancel", reason }); close(); }}
        />
      )}
      {modal === "refund" && (
        <ConfirmModal
          title="Mark this plan as refunded?" confirmLabel="Mark Refunded"
          body="Recorded payments stay in history exactly as they happened — this only changes the plan's status."
          onClose={() => setModal(null)}
          onConfirm={async (reason) => { await call(`/api/leads/${leadId}/payments/${plan.id}`, { action: "refund", reason }); close(); }}
        />
      )}
    </div>
  );
}
