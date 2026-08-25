import QRCode from "qrcode";
import { getSession } from "@/lib/auth";
import { isCompanySuspended } from "@/lib/helpers/permissions";
import { ok, badRequest, notFound, unauthorized, forbidden, withErrorHandling } from "@/lib/helpers/response";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { buildUpiLink } from "@/lib/payments/upiLink";

/**
 * Any authenticated company user can fetch their own company's payment QR
 * — this is meant to be pulled up by an employee at the point of sale
 * (store counter, delivery, petrol pump), not just a Super Admin viewing
 * their own settings page. Never accepts a UPI ID from the request — always
 * the company's own configured one, so nobody can point this at a UPI ID
 * that isn't the company's.
 *
 * `?amount=` overrides the company's default fixed/negotiable mode for a
 * one-off collection (e.g. an employee generating a QR for this specific
 * sale's exact total) — still constrained to a positive number.
 */
export const GET = withErrorHandling(async (request) => {
  const session = await getSession();
  if (!session) return unauthorized();
  if (isCompanySuspended(session)) return forbidden("Your company account has been suspended.");
  const settings = await getSettingsByGroup(session, "payments");
  if (!settings.upi_id) return notFound("This company hasn't configured a UPI ID yet.");

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "png";

  let amount = null;
  const amountParam = searchParams.get("amount");
  if (amountParam != null && amountParam !== "") {
    amount = Number(amountParam);
    if (!(amount > 0)) return badRequest("amount must be a positive number.");
  } else if (settings.upi_qr_mode === "fixed" && settings.upi_fixed_amount) {
    amount = Number(settings.upi_fixed_amount);
  }
  // upi_qr_mode="negotiable" (or unset) leaves amount=null — the payer's
  // UPI app prompts for the amount, same as an open merchant QR.

  const link = buildUpiLink({ upiId: settings.upi_id, payeeName: settings.upi_display_name, amount, note: searchParams.get("note") });

  if (format === "json") return ok({ link, amount });

  if (format === "svg") {
    const svg = await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }
  const buffer = await QRCode.toBuffer(link, { type: "png", width: 512, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  return new Response(buffer, { headers: { "Content-Type": "image/png" } });
});
