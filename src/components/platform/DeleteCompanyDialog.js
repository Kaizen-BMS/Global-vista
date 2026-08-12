"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function DeleteCompanyDialog({ companyId, companyName }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await apiFetch(`/api/platform/companies/${companyId}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmName: confirmText }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete company.");
      toast.success(`"${companyName}" permanently deleted.`);
      router.push("/platform/companies");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setDeleting(false); }
  }

  return (
    <>
      <div className="bg-card border border-red-500/30 rounded-xl p-5">
        <p className="text-red-400 font-medium mb-1 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Danger Zone</p>
        <p className="text-muted-foreground text-sm mb-4">Permanently delete this company and every record it owns — leads, documents, users, subscriptions, everything. This cannot be undone.</p>
        <button onClick={() => setOpen(true)} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium cursor-pointer transition">
          Delete Company
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-card border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-foreground font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-400" /> Delete Company</h2>
              <button onClick={() => setOpen(false)} disabled={deleting} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-foreground text-sm font-medium mb-1">{companyName}</p>
            <p className="text-red-400 text-xs mb-4">This action permanently deletes this company's data and cannot be undone.</p>
            <label className="block text-muted-foreground text-xs mb-1.5">
              Type <span className="text-foreground font-medium">{companyName}</span> to confirm deletion.
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-4"
              autoComplete="off"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setOpen(false)} disabled={deleting} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting || confirmText !== companyName}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium disabled:opacity-50 cursor-pointer transition"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete Company
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
