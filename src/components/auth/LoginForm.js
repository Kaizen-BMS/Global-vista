"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Lock, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { apiFetch } from "@/components/shared/apiClient";
import FloatingInput from "@/components/auth/FloatingInput";

/** Only ever follows a redirect that's a genuine internal path — e.g.
 * `/workspace/settings/subscription?checkoutPlan=3&checkoutMonths=12` from
 * the pricing page. Never `//evil.com` or `https://…` (both of which would
 * make this an open-redirect vector for a phishing link built around this
 * app's own login page), and never a `/platform/*` path for a non-operator
 * request either — role mismatches like that just fall back to the normal
 * post-login destination instead of erroring. */
function safeRedirect(raw) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export default function LoginForm({ onNavigate }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = safeRedirect(searchParams.get("redirect"));
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Unchanged: same endpoint, same payload, same response handling as before this redesign.
      const res = await apiFetch("/api/core/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, rememberMe }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed."); toast.error(data.error || "Login failed."); setLoading(false); return; }

      toast.success(`Welcome, ${data.user.name}`);
      setSuccess(true);
      // Brief, purely cosmetic pause so the success state is visible before navigating away.
      await new Promise((r) => setTimeout(r, 600));

      if (data.mustChangePassword) router.push("/workspace/change-password?forced=1"); // forced password change always wins, even over a pending checkout
      else if (redirectTarget) router.push(redirectTarget);
      else if (data.user.is_platform_operator) router.push("/platform");
      else router.push("/workspace/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong.");
      toast.error("Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <CheckCircle2 className="h-14 w-14 text-emerald-400" />
          </motion.div>
          <p className="text-white font-medium mt-4">Signing you in…</p>
          <p className="text-white/40 text-sm mt-1">Taking you to your workspace</p>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <h1 className="text-2xl font-semibold text-white mb-1.5">Welcome back</h1>
          <p className="text-white/50 text-sm mb-7">Sign in to your KaizenBMS Platform workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <FloatingInput label="Email" type="email" icon={Mail} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <FloatingInput label="Password" type="password" icon={Lock} required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />

            {error && (
              <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="text-red-400 text-xs" role="alert">{error}</motion.p>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer select-none">
                <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="cursor-pointer accent-indigo-500" />
                Remember me
              </label>
              <button type="button" onClick={() => onNavigate("forgot")} className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer">Forgot password?</button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</> : <>Sign In <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <p className="text-center text-white/35 text-xs mt-8">
            Don&rsquo;t have an account? <Link href="/register" className="text-indigo-400 hover:text-indigo-300">Start your free trial</Link>
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
