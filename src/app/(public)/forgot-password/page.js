"use client";

import { useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Mail } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
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
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#000_60%)]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-neutral-900/70 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        <h1 className="text-2xl font-semibold text-white mb-1">Reset Password</h1>
        <p className="text-neutral-400 text-sm mb-6">We'll email you a reset link.</p>

        {sent ? (
          <p className="text-green-400 text-sm">If that email exists, a reset link has been sent.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="block text-sm text-neutral-300 mb-1">Email</label>
            <div className="relative mb-6">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@company.com" />
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-60">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}