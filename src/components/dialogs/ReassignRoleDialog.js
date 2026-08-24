"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

export default function ReassignRoleDialog({ role, otherRoles, onClose }) {
  const router = useRouter(); const [targetRoleId, setTargetRoleId] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  async function handleConfirm() {
    if (!targetRoleId) { toast.error("Select a target role."); return; }
    setBusy(true);
    try { const res = await apiFetch(`/api/core/roles/${role.id}?reassignToRoleId=${targetRoleId}`, { method: "DELETE" }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Reassigned + deleted."); onClose(); router.refresh(); }
    catch (e) { toast.error(e.message); } finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Reassign role" className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-foreground font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-400" />Reassign First</h2><button onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button></div>
        <p className="text-muted-foreground text-sm mb-4">{role.name} has {role.user_count} user(s). Choose where to move them.</p>
        <select value={targetRoleId} onChange={(e) => setTargetRoleId(e.target.value)} className="w-full mb-6 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
          <option value="">Select role</option>{otherRoles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <button onClick={handleConfirm} disabled={busy} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Reassign & Delete</button>
      </div>
      </ModalFocusTrap>
    </div>
  );
}