"use client";
import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/components/shared/apiClient";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");
  const [checking, setChecking] = useState(true); const [tokenValid, setTokenValid] = useState(false);
  const [password, setPassword] = useState(""); const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) { setChecking(false); return; }
    fetch(`/api/core/auth/reset-password?token=${encodeURIComponent(token)}`).then((r) => r.json()).then((d) => { setTokenValid(d.valid); setChecking(false); });
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    const res = await apiFetch("/api/core/auth/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    if (res.ok) { router.push("/workspace/dashboard"); router.refresh(); } else setSaving(false);
  }
  if (checking) return <p className="text-neutral-400 text-sm">Verifying...</p>;
  if (!tokenValid) return <p className="text-red-400 text-sm">Invalid or expired link.</p>;
  return (
    <form onSubmit={handleSubmit}>
      <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
      <button type="submit" disabled={saving} className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">Update Password</button>
    </form>
  );
}
export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
        <h1 className="text-2xl font-semibold text-white mb-4">Set New Password</h1>
        <Suspense fallback={<p className="text-neutral-400 text-sm">Loading...</p>}><ResetForm /></Suspense>
      </div>
    </div>
  );
}