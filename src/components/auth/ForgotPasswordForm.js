"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, MailCheck } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import FloatingInput from "@/components/auth/FloatingInput";

export default function ForgotPasswordForm({ onNavigate }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      // Unchanged: same endpoint (/api/core/auth/forgot-password) and payload as before this redesign.
      const res = await apiFetch("/api/core/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {sent ? (
        <motion.div key="sent" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
          <motion.div
            initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 16 }}
            className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/30 mb-5"
          >
            <MailCheck className="h-7 w-7 text-emerald-400" />
          </motion.div>
          <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
          <p className="text-white/50 text-sm leading-relaxed">If an account exists for <span className="text-white/80">{email}</span>, a reset link is on its way.</p>
          <button type="button" onClick={() => onNavigate("login")} className="inline-flex items-center gap-1.5 mt-7 text-indigo-400 hover:text-indigo-300 text-sm transition-colors cursor-pointer">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </button>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-semibold text-white mb-1.5">Forgot your password?</h1>
          <p className="text-white/50 text-sm mb-7">No problem — we&rsquo;ll email you a reset link.</p>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <FloatingInput label="Email" type="email" icon={Mail} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending…" : "Send Reset Link"}
            </button>
          </form>

          <button type="button" onClick={() => onNavigate("login")} className="flex items-center justify-center gap-1.5 mt-7 text-white/40 hover:text-white text-sm transition-colors cursor-pointer mx-auto">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
