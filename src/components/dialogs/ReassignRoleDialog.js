"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function ReassignRoleDialog({ role, otherRoles, onClose }) {
  const router = useRouter(); const [targetRoleId, setTargetRoleId] = useState(""); const [busy, setBusy] = useState(false);
  async function handleConfirm() {
    if (!targetRoleId) { toast.error("Select a target role."); return; }
    setBusy(true);
    try { const res = await apiFetch(`/api/core/roles/${role.id}?reassignToRoleId=${targetRoleId}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Reassigned + deleted."); onClose(); router.refresh(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-white font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-400" />Reassign First</h2><button onClick={onClose}><X className="h-4 w-4 text-neutral-500" /></button></div>
        <p className="text-neutral-400 text-sm mb-4">{role.name} has {role.user_count} user(s). Choose where to move them.</p>
        <select value={targetRoleId} onChange={(e) => setTargetRoleId(e.target.value)} className="w-full mb-6 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm">
          <option value="">Select role</option>{otherRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={handleConfirm} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Reassign & Delete</button>
      </div>
    </div>
  );
}