import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getPaymentReceipt } from "@/lib/modules/crm/actions/payments";
import { getCompanyBranding } from "@/lib/actions/companyBranding";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDateTime, formatDate } from "@/lib/helpers/dateFormat";
import { formatMoney } from "@/lib/helpers/formatCurrency";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";
import PrintReceiptButton from "@/components/crm/leads/PrintReceiptButton";

export default async function PaymentReceiptPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const { paymentId } = await params;
  let receipt;
  try { receipt = await getPaymentReceipt(session, paymentId); }
  catch { return <WorkspaceNotFound />; }

  const [branding, systemSettings] = await Promise.all([getCompanyBranding(session), getSettingsByGroup(session, "system")]);
  const timezone = systemSettings.timezone || "UTC";
  const { payment, totalPaid, remaining } = receipt;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-end mb-4 print:hidden"><PrintReceiptButton /></div>

      <div className="bg-white text-black rounded-xl border border-border shadow-sm p-8 print:shadow-none print:border-0">
        <div className="flex items-start justify-between pb-6 border-b border-neutral-200">
          <div className="flex items-center gap-3">
            {branding.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="h-12 w-12 object-contain rounded" />
            )}
            <div>
              <p className="font-semibold text-lg">{branding.name}</p>
              {branding.address && <p className="text-neutral-500 text-xs max-w-xs">{branding.address}</p>}
              {branding.contactEmail && <p className="text-neutral-500 text-xs">{branding.contactEmail}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-neutral-400 text-xs uppercase tracking-wide">Payment Receipt</p>
            <p className="font-mono text-sm">#{String(payment.id).padStart(6, "0")}</p>
            <p className="text-neutral-500 text-xs">{formatDateTime(payment.created_at, timezone)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-6 border-b border-neutral-200 text-sm">
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Lead / Student</p>
            <p className="font-medium">{payment.lead_name || "—"} {payment.lead_number ? `(${payment.lead_number})` : ""}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Service</p>
            <p className="font-medium">{payment.service_name}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Payment Method</p>
            <p className="font-medium">{payment.payment_method}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Transaction Reference</p>
            <p className="font-medium">{payment.reference_id || "—"}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Payment Date</p>
            <p className="font-medium">{formatDate(payment.payment_date, timezone)}</p>
          </div>
          <div>
            <p className="text-neutral-400 text-xs mb-0.5">Received By</p>
            <p className="font-medium">{payment.received_by_name || "—"}</p>
          </div>
        </div>

        <div className="py-6 border-b border-neutral-200">
          <div className="flex justify-between text-sm mb-2"><span className="text-neutral-500">Total Payable</span><span>{formatMoney(payment.total_payable, payment.plan_currency)}</span></div>
          <div className="flex justify-between text-sm mb-2"><span className="text-neutral-500">Total Paid (to date)</span><span>{formatMoney(totalPaid, payment.plan_currency)}</span></div>
          <div className="flex justify-between text-sm mb-3"><span className="text-neutral-500">Remaining Balance</span><span>{formatMoney(remaining, payment.plan_currency)}</span></div>
          <div className="flex justify-between items-center pt-3 border-t border-neutral-200">
            <span className="font-medium">Amount Received</span>
            <span className="text-xl font-bold">{formatMoney(payment.amount, payment.currency)}</span>
          </div>
        </div>

        {payment.notes && (
          <div className="py-4 border-b border-neutral-200 text-sm">
            <p className="text-neutral-400 text-xs mb-1">Notes</p>
            <p>{payment.notes}</p>
          </div>
        )}

        <p className="text-center text-neutral-400 text-xs pt-6">{GLOBAL_VISTA_BRANDING.poweredByLabel}</p>
      </div>
    </div>
  );
}
