"use client";
import { ExternalLink, ShieldCheck } from "lucide-react";

/** Public, unauthenticated page a lead opens from a WhatsApp message — the
 * amount here is plain text, not an input, because it comes from the
 * payment_requests row via its token, not anything this page (or the payer)
 * can change. */
export default function PayLinkView({ request, link, token }) {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-[#131722] border border-white/10 rounded-2xl p-6 text-center">
        <p className="text-white/50 text-xs uppercase tracking-[0.15em] mb-1">Payment request</p>
        <h1 className="text-xl font-semibold mb-1">{request.companyName}</h1>
        {request.note && <p className="text-white/60 text-sm mb-4">{request.note}</p>}

        <p className="text-4xl font-bold tabular-nums mt-4 mb-1">
          {request.currency} {Number(request.amount).toLocaleString()}
        </p>
        <p className="text-white/40 text-xs mb-6">Fixed amount — set by {request.companyName}</p>

        {link ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/public/pay/${token}/qr`} alt="Scan to pay" className="mx-auto h-56 w-56 rounded-xl border border-white/10 bg-white" />
            <a
              href={link}
              className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition"
            >
              <ExternalLink className="h-4 w-4" /> Open in UPI app
            </a>
          </>
        ) : (
          <p className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            This company hasn't finished setting up their UPI details yet — please contact them directly.
          </p>
        )}

        <p className="flex items-center justify-center gap-1.5 text-white/30 text-[11px] mt-6">
          <ShieldCheck className="h-3.5 w-3.5" /> Paid directly to {request.companyName}'s own UPI account — no fees, no middleman.
        </p>
      </div>
    </div>
  );
}
