import { notFound } from "next/navigation";
import { getPaymentRequestByToken, buildPaymentRequestUpiLink } from "@/lib/modules/crm/actions/paymentRequests";
import PayLinkView from "@/components/payments/PayLinkView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { token } = await params;
  const request = await getPaymentRequestByToken(token);
  if (!request) return { title: "Payment link" };

  // wa.me (and every other "click-to-chat" link) can only pre-fill TEXT —
  // no link anywhere on the web can make WhatsApp auto-attach an image to
  // the message itself, that's a WhatsApp platform restriction, not
  // something fixable from this side. What DOES work, with no WhatsApp
  // Business API needed: WhatsApp (like most chat apps) renders an
  // OpenGraph LINK PREVIEW card for any plain URL it sees — pointing
  // og:image at the same QR the page itself shows means the QR appears
  // right in the chat bubble as that preview's thumbnail.
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const title = `Pay ${request.companyName} — ${request.currency} ${Number(request.amount).toLocaleString()}`;
  const description = request.note || `Scan or tap to pay ${request.companyName} directly via UPI.`;
  const imageUrl = `${appUrl}/api/public/pay/${token}/qr`;

  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: imageUrl, width: 512, height: 512 }] },
    twitter: { card: "summary", title, description, images: [imageUrl] },
  };
}

export default async function PayLinkPage({ params }) {
  const { token } = await params;
  const request = await getPaymentRequestByToken(token);
  if (!request) return notFound();

  const link = buildPaymentRequestUpiLink(request);
  return <PayLinkView request={request} link={link} token={token} />;
}
