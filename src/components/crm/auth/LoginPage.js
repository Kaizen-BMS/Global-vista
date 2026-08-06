"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Lock, Mail, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

/**
 * Moved from app/crm/(public)/login/page.js — logic unchanged from the
 * working Phase 1 implementation. Only two things changed: the redirect
 * destination now branches on is_platform_operator (new requirement),
 * and the "forgot password" link points to /forgot-password instead of
 * /crm/forgot-password.
 */
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed.");
        return;
      }
      toast.success(`Welcome back, ${data.user.name}`);

      if (data.mustChangePassword) {
        router.push("/workspace/change-password?forced=1");
      } else if (data.user.is_platform_operator) {
        router.push("/platform");
      } else {
        router.push("/workspace/dashboard");
      }
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[radial-gradient(circle_at_top,_#1e1b4b_0%,_#000_60%)]">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-sm bg-neutral-900/70 backdrop-blur-xl border border-neutral-800 rounded-2xl p-8 shadow-2xl"
      >
        <h1 className="text-2xl font-semibold text-white mb-1">Sign In</h1>
        <p className="text-neutral-400 text-sm mb-6">Global Vista Platform</p>

        <label className="block text-sm text-neutral-300 mb-1">Email</label>
        <div className="relative mb-4">
          <Mail className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="you@company.com"
          />
        </div>

        <label className="block text-sm text-neutral-300 mb-1">Password</label>
        <div className="relative mb-3">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
          <input
            type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-neutral-800/80 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
          <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-300">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 text-xs text-neutral-400">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember me
          </label>
          <a href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300">Forgot password?</a>
        </div>

        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </motion.form>
    </div>
  );
}