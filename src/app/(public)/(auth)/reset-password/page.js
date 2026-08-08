"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Loader2, ShieldCheck, ShieldX, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import AuthShell from "@/components/auth/AuthShell";
import FloatingInput from "@/components/auth/FloatingInput";
import PasswordStrengthMeter from "@/components/auth/PasswordStrengthMeter";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [checking, setChecking] = useState(true); const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState(""); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Unchanged: same token-verification GET as before this redesign.
    if (!token) { setChecking(false); return; }
    fetch(`/api/core/auth/reset-password?token=${encodeURIComponent(token)}`).then((r) => r.json()).then((d) => { setTokenValid(d.valid); setChecking(false); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    // Unchanged: same endpoint/payload as before this redesign.
    const res = await apiFetch("/api/core/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setSuccess(true);
      await new Promise((r) => setTimeout(r, 900));
      router.push("/workspace/dashboard");
      router.refresh();
    } else {
      setError(data.error || "Failed to reset password.");
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <Loader2 className="h-6 w-6 text-white/40 animate-spin mb-3" />
        <p className="text-white/50 text-sm">Verifying your link…</p>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-16 w-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/30 mb-5">
          <ShieldX className="h-7 w-7 text-red-400" />
        </div>
        <h1 className="text-xl font-semibold text-white mb-2">This link has expired</h1>
        <p className="text-white/50 text-sm leading-relaxed mb-6">Reset links are only valid for 30 minutes. Request a new one to continue.</p>
        <a href="/forgot-password" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-all cursor-pointer hover:-translate-y-0.5">
          Request New Link
        </a>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {success ? (
        <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center text-center py-16">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
            <CheckCircle2 className="h-14 w-14 text-emerald-400" />
          </motion.div>
          <p className="text-white font-medium mt-4">Password updated</p>
          <p className="text-white/40 text-sm mt-1">Taking you to your workspace</p>
        </motion.div>
      ) : (
        <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <h1 className="text-2xl font-semibold text-white">Set a new password</h1>
          </div>
          <p className="text-white/50 text-sm mb-7">Make it strong — you&rsquo;ll use this to sign in from now on.</p>

          <form onSubmit={handleSubmit} className="space-y-1" noValidate>
            <FloatingInput label="New password" type="password" icon={Lock} required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <PasswordStrengthMeter password={password} />

            {error && <p className="text-red-400 text-xs mt-3" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 mt-5 rounded-xl text-white text-sm font-medium transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500 hover:shadow-[0_0_24px_rgba(99,102,241,0.45)] hover:-translate-y-0.5 active:translate-y-0"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Updating…" : "Update Password"}
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 text-white/40 animate-spin" /></div>}>
        <ResetForm />
      </Suspense>
    </AuthShell>
  );
}
