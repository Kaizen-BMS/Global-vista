"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { GLOBAL_VISTA_BRANDING } from "@/lib/constants/platformBranding";

export default function RegisterConfirmPage() {
  return (
    <Suspense fallback={<ConfirmShell><Loader2 className="h-10 w-10 text-indigo-400 mx-auto mb-4 animate-spin" /></ConfirmShell>}>
      <RegisterConfirmInner />
    </Suspense>
  );
}

function ConfirmShell({ children }) {
  return (
    <div className="min-h-screen bg-[#05060f] text-white flex items-center justify-center px-4 overflow-hidden">
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none" />
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 text-center shadow-2xl shadow-black/40">
        <p className="text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-4">{GLOBAL_VISTA_BRANDING.name}</p>
        {children}
      </motion.div>
    </div>
  );
}

function RegisterConfirmInner() {
  const searchParams = useSearchParams();
  const [state, setState] = useState("loading");
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const orderId = searchParams.get("order_id");
    if (!orderId) { setState("error"); setError("No transaction reference was returned by BillDesk."); return; }
    (async () => {
      try {
        const res = await fetch(`/api/public/register/billdesk-confirm?order_id=${encodeURIComponent(orderId)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not confirm your subscription.");
        setDetail(data);
        setState(data.status === "active" ? "success" : "pending");
      } catch (err) { setState("error"); setError(err.message); }
    })();
  }, [searchParams]);

  return (
    <ConfirmShell>
      {state === "loading" && (
        <>
          <Loader2 className="h-10 w-10 text-indigo-400 mx-auto mb-4 animate-spin" />
          <p className="text-white font-medium">Confirming your subscription with BillDesk…</p>
        </>
      )}
      {state === "success" && (
        <>
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <CheckCircle2 className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
          </motion.div>
          <p className="text-white text-lg font-semibold">You're all set</p>
          <p className="text-white/50 text-sm mt-1">Your subscription is active — log in to start using your workspace.</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition hover:shadow-[0_0_30px_rgba(99,102,241,0.5)]">
            Log In
          </Link>
        </>
      )}
      {state === "pending" && (
        <>
          <Loader2 className="h-10 w-10 text-amber-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Still processing</p>
          <p className="text-white/50 text-sm mt-1">BillDesk reports this as "{detail?.status}". It'll finish activating shortly — you can log in and check anytime.</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-white text-sm font-medium transition">Log In</Link>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-semibold">Couldn't confirm subscription</p>
          <p className="text-white/50 text-sm mt-1">{error}</p>
          <Link href="/login" className="inline-flex items-center gap-1.5 mt-6 px-5 py-2.5 rounded-lg border border-white/15 hover:border-white/30 text-white text-sm font-medium transition">Log In</Link>
        </>
      )}
    </ConfirmShell>
  );
}
