"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * The PayPal return_url lands here. This page NEVER treats its own load as
 * proof of payment — it calls the server, which re-fetches the subscription
 * from PayPal itself before writing anything. This is purely a "here's what
 * the server confirmed" display; the webhook is the durable source of
 * truth if the user closes the tab before this ever loads.
 */
export default function SubscriptionConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="h-8 w-8 text-indigo-400 animate-spin" /></div>}>
      <SubscriptionConfirmInner />
    </Suspense>
  );
}

function SubscriptionConfirmInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState("loading"); // loading | success | pending | error
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const subscriptionId = searchParams.get("subscription_id");
    if (!subscriptionId) { setState("error"); setError("No subscription reference was returned by PayPal."); return; }

    (async () => {
      try {
        const res = await apiFetch(`/api/core/subscription/confirm?subscription_id=${encodeURIComponent(subscriptionId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not confirm the subscription.");
        setDetail(data);
        setState(data.status === "active" ? "success" : "pending");
      } catch (err) {
        setState("error");
        setError(err.message);
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-card border border-border rounded-2xl p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-indigo-400 mx-auto mb-4 animate-spin" />
            <p className="text-foreground font-medium">Confirming your subscription with PayPal…</p>
            <p className="text-muted-foreground text-sm mt-1">This only takes a moment.</p>
          </>
        )}
        {state === "success" && (
          <>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-foreground text-lg font-semibold">Subscription activated</p>
            <p className="text-muted-foreground text-sm mt-1">Your plan is now active. A receipt has been emailed to your Company Super Admin.</p>
            <Link href="/workspace/settings/subscription" className="inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition">
              View Subscription <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </>
        )}
        {state === "pending" && (
          <>
            <Loader2 className="h-10 w-10 text-amber-400 mx-auto mb-4" />
            <p className="text-foreground text-lg font-semibold">Still processing</p>
            <p className="text-muted-foreground text-sm mt-1">PayPal reports this subscription as "{detail?.status}". It will activate automatically once approval finishes — this page doesn't need to stay open.</p>
            <Link href="/workspace/settings/subscription" className="inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium transition">
              Back to Subscription
            </Link>
          </>
        )}
        {state === "error" && (
          <>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            </motion.div>
            <p className="text-foreground text-lg font-semibold">Couldn't confirm subscription</p>
            <p className="text-muted-foreground text-sm mt-1">{error}</p>
            <Link href="/workspace/settings/subscription" className="inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm font-medium transition">
              Back to Subscription
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
}
