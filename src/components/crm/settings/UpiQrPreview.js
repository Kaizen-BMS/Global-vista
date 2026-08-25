"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ExternalLink, Printer } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

/** Shows the company's OWN live, real UPI QR — generated server-side from
 * whatever's currently saved in Settings (see /api/core/payments/upi-qr),
 * not a manually uploaded image. Reflects the saved settings, so it
 * updates right after Save is clicked (not while typing) — this component
 * doesn't try to mirror the form's in-progress edits. */
export default function UpiQrPreview({ hasUpiId }) {
  const [link, setLink] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasUpiId) { setLoading(false); return; }
    apiFetch("/api/core/payments/upi-qr?format=json")
      .then((r) => r.json())
      .then((d) => setLink(d.link || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [hasUpiId]);

  if (!hasUpiId) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 max-w-xl mt-4">
        <p className="text-muted-foreground text-sm">Add a UPI ID above and save to generate your payment QR.</p>
      </div>
    );
  }
  if (loading) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-xl mt-4">
      <p className="text-foreground font-medium mb-1">Your Payment QR</p>
      <p className="text-muted-foreground text-xs mb-4">
        Real, live-generated from your UPI ID — no gateway, no fee, money goes straight to your account. Show this on a counter, print it, or share it, the same way a shop or petrol pump displays its own QR stand.
      </p>
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/core/payments/upi-qr" alt="UPI payment QR code" className="h-48 w-48 rounded-lg border border-border bg-white" />
        <div className="flex-1 min-w-0 space-y-2">
          {link && (
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground text-xs truncate" />
              <button
                onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copied."); }}
                aria-label="Copy payment link" className="p-1.5 rounded-lg bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer transition"
              ><Copy className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {link && (
              <a href={link} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition">
                <ExternalLink className="h-3.5 w-3.5" /> Open in UPI app
              </a>
            )}
            <a href="/api/core/payments/upi-qr?format=svg" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs font-medium cursor-pointer transition">
              <Printer className="h-3.5 w-3.5" /> Open printable version
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
