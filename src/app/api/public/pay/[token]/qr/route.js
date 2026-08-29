import QRCode from "qrcode";
import { notFound, withErrorHandling } from "@/lib/helpers/response";
import { getPaymentRequestByToken, buildPaymentRequestUpiLink } from "@/lib/modules/crm/actions/paymentRequests";

/**
 * Public by design (the payer isn't logged into the CRM) — but the amount
 * is never a parameter here, only the unguessable token. Everything the QR
 * encodes comes straight from the stored payment_requests row.
 */
export const GET = withErrorHandling(async (request, context) => {
  const { token } = await context.params;
  const paymentRequest = await getPaymentRequestByToken(token);
  if (!paymentRequest) return notFound("This payment link is invalid or has expired.");

  const link = buildPaymentRequestUpiLink(paymentRequest);
  if (!link) return notFound("This company hasn't configured a UPI ID.");

  const { searchParams } = new URL(request.url);
  if (searchParams.get("format") === "svg") {
    const svg = await QRCode.toString(link, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }
  const buffer = await QRCode.toBuffer(link, { type: "png", width: 512, margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  return new Response(buffer, { headers: { "Content-Type": "image/png" } });
});
