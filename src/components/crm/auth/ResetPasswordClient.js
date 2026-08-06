"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Lock, CheckCircle2, XCircle, Clock } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

function scorePassword(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-blue-500", "bg-green-500"];

// Adds `redirectBase` prop (defaults preserved for backward callers) so
// this component works for the new /workspace destination without
// hardcoding it — the only functional addition versus the pre-migration
// version; token verification/submit logic is unchanged.
export default function ResetPasswordClient({ redirectBase = "/workspace/dashboard" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [checking, setChecking] = useState(true);
  const [tokenState, setTokenState] = useState(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = useMemo(() => scorePassword(password), [password]);

  useEffect(() => {
    if (!token) { setTokenState("missing"); setChecking(false); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => { setTokenState(data.valid ? "valid" : data.reason || "invalid"); setChecking(false); })
      .catch(() => { setTokenState("invalid"); setChecking(false); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (strength < 4) { toast.error("Use a stronger password."); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to reset password.");
        if (data.error?.includes("expired") || data.error?.includes("Invalid")) setTokenState("expired");
        return;
      }
      setSuccess(true);
      toast.success("Password updated.");
      setTimeout(() => { router.push(redirectBase); router.refresh(); }, 1500);
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#000_60%)]">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-neutral-900/70 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl">
        {checking && (
          <div className="text-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-400 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm">Verifying reset link…</p>
          </div>
        )}
        {!checking && success && (
          <div className="text-center py-6">
            <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-3" />
            <h1 className="text-white text-lg font-medium mb-1">Password Updated</h1>
            <p className="text-neutral-500 text-sm">Redirecting you…</p>
          </div>
        )}
        {!checking && !success && tokenState === "expired" && (
          <div className="text-center py-6">
            <Clock className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
            <h1 className="text-white text-lg font-medium mb-1">Link Expired</h1>
            <p className="text-neutral-500 text-sm mb-6">Request a new one.</p>
            <a href="/forgot-password" className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition">Request New Link</a>
          </div>
        )}
        {!checking && !success && (tokenState === "invalid" || tokenState === "missing") && (
          <div className="text-center py-6">
            <XCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <h1 className="text-white text-lg font-medium mb-1">Invalid Link</h1>
            <p className="text-neutral-500 text-sm mb-6">This reset link is invalid or already used.</p>
            <a href="/forgot-password" className="inline-block px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition">Request New Link</a>
          </div>
        )}
        {!checking && !success && tokenState === "valid" && (
          <form onSubmit={handleSubmit}>
            <h1 className="text-2xl font-semibold text-white mb-1">Set New Password</h1>
            <p className="text-neutral-400 text-sm mb-6">Choose a strong password.</p>
            <label className="block text-sm text-neutral-300 mb-1">New Password</label>
            <div className="relative mb-2">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
            </div>
            {password && (
              <div className="mb-4">
                <div className="flex gap-1 mb-1">
                  {[0, 1, 2, 3, 4].map((i) => <div key={i} className={`h-1 flex-1 rounded-full ${i < strength ? STRENGTH_COLORS[strength - 1] : "bg-neutral-800"}`} />)}
                </div>
                <p className="text-xs text-neutral-500">{STRENGTH_LABELS[Math.max(0, strength - 1)]}</p>
              </div>
            )}
            <label className="block text-sm text-neutral-300 mb-1">Confirm Password</label>
            <div className="relative mb-6">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-60">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Updating..." : "Update Password"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}