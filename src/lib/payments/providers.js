import "server-only";
import { getSettingsByGroup } from "@/lib/actions/settings";

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

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "UPI", "PayPal", "Card", "Other"];

// PayPal's client ID/secret AND mode all live in env vars only — never in a
// DB settings table, never sent to the browser. Mode specifically must be
// env-controlled (not a DB toggle an operator could flip in the UI without
// also updating the matching credentials) since PAYPAL_MODE is what
// actually routes every API call in src/lib/payments/paypalClient.js —
// a DB-only toggle here would risk this status display disagreeing with
// where transactions actually go.
export async function getPayPalStatus() {
  const configured = !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  const mode = (process.env.PAYPAL_MODE || "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
  return { configured, mode };
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
 * now for this company — Cash/Bank Transfer/Card/Other always need only a
 * manual record (no provider config required); UPI/PayPal are hidden until
 * their provider is actually configured, so the payment-recording UI never
 * offers a method that would silently fail or fake success. */
export async function getAvailablePaymentMethods(session) {
  const [upi, paypal] = await Promise.all([getUpiConfig(session), getPayPalStatus()]);
  return PAYMENT_METHODS.filter((m) => {
    if (m === "UPI") return upi.configured;
    if (m === "PayPal") return paypal.configured;
    return true;
  });
}
