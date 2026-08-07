"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function ChangePasswordForm({ forced }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState(""); const [newPassword, setNewPassword] = useState(""); const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch("/api/core/auth/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currentPassword, newPassword }) });
      const data = await res.json(); if (!res.ok) { toast.error(data.error || "Failed."); return; }
      toast.success("Updated."); router.push("/workspace/dashboard"); router.refresh();
    } catch { toast.error("Something went wrong."); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
      {!forced && <input type="password" required placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />}
      <input type="password" required minLength={8} placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
      <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Update Password</button>
    </form>
  );
}