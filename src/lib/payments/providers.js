import "server-only";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { getBillDeskStatus as getBillDeskGatewayStatus } from "@/lib/payments/billdeskClient";

/**
 * Configuration-resolution layer for payment methods — deliberately scoped
 * to "is a method usable, and with what config" rather than "execute a
 * transaction." Actually recording a payment needs the payments/
 * payment_plans schema, which doesn't exist yet (see the pending migration
 * in the platform payment-system rollout); this module is the part of the
 * PaymentProvider abstraction that's real and usable today, and the part
 * that will plug straight into the transaction-recording code once that
 * schema lands, without needing to change how config is resolved.
 */

// "PayPal" here is a manual bookkeeping label for HOW a lead/student paid the
// company (same category as Cash/Bank Transfer/Card/Other) — nothing to do
// with KaizenBMS's own company-subscription payment gateway (BillDesk).
// Always available like the other manual labels; never gated by any gateway
// credential.
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "PayPal", "Card", "Other"];

/** BillDesk status for the COMPANY SUBSCRIPTION billing checkout (platform
 * billing a company for its CRM plan). Never exposes secrets — only
 * configured/environment is returned to callers. */
export async function getBillDeskStatus() {
  return getBillDeskGatewayStatus();
}

// UPI has no secrets to protect — a UPI ID is meant to be shared to receive
// payment, the same way a bank account number is. Company-scoped via
// crm_settings, same as every other per-company setting.
export async function getUpiConfig(session) {
  const settings = await getSettingsByGroup(session, "payments");
  const configured = !!(settings.upi_id && settings.upi_id.trim());
  return {
    configured,
    upiId: settings.upi_id || null,
    displayName: settings.upi_display_name || null,
    qrUrl: settings.upi_qr_url || null,
    instructions: settings.upi_instructions || null,
  };
}

/** Which of the fixed PAYMENT_METHODS an employee can actually select right
 * now for this company — Cash/Bank Transfer/PayPal/Card/Other always need
 * only a manual record (no provider config required); UPI is hidden until
 * the company's own UPI ID is configured, so the payment-recording UI never
 * offers a method that would silently fail or fake success. */
export async function getAvailablePaymentMethods(session) {
  const upi = await getUpiConfig(session);
  return PAYMENT_METHODS.filter((m) => {
    if (m === "UPI") return upi.configured;
    return true;
  });
}
