"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiFetch } from "@/components/shared/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true); const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true);
    try {
      const res = await apiFetch("/api/core/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password, rememberMe }) });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Login failed."); return; }
      toast.success(`Welcome, ${data.user.name}`);
      if (data.mustChangePassword) router.push("/workspace/change-password?forced=1");
      else if (data.user.is_platform_operator) router.push("/platform");
      else router.push("/workspace/dashboard");
      router.refresh();
    } catch { toast.error("Something went wrong."); } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-6">Sign In</h1>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full mb-3 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
        <label className="flex items-center gap-2 text-xs text-neutral-400 mb-4">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
        </label>
        <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <a href="/forgot-password" className="block text-center text-xs text-indigo-400 mt-4">Forgot password?</a>
      </form>
    </div>
  );
}