"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, FileText } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import DocumentTypeForm from "@/components/forms/DocumentTypeForm";
import EmptyState from "@/components/shared/EmptyState";

export default function DocumentTypeManager({ initialTypes }) {
  const router = useRouter();
  const [types, setTypes] = useState(initialTypes);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function refresh() {
    router.refresh();
    setEditing(null);
    setCreating(false);
  }

  async function remove(type) {
    if (!confirm(`Delete "${type.name}"? Employees will no longer be asked for this document.`)) return;
    setBusyId(type.id);
    try {
      const res = await apiFetch(`/api/core/organization/document-types/${type.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Document type deleted.");
      setTypes((t) => t.filter((x) => x.id !== type.id));
    } catch { toast.error("Failed to delete."); } finally { setBusyId(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">Define the documents your company requires from employees — fully custom, no code changes needed.</p>
        <button onClick={() => setCreating(true)} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer shrink-0 ml-4">
          <Plus className="h-4 w-4" /> Add Document Type
        </button>
      </div>

      {types.length === 0 ? (
        <EmptyState icon={FileText} title="No document types yet" description="Add your first document type, e.g. Passport or PAN Card." />
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {types.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-foreground text-sm font-medium">{t.name}</p>
                  {!!t.is_required && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400">Required</span>}
                  {t.status === "inactive" && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">Inactive</span>}
                  {!!t.expiry_required && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-400">Expires</span>}
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{t.allowed_file_types} · max {t.max_file_size_mb}MB{t.description ? ` · ${t.description}` : ""}</p>
              </div>
              <button onClick={() => setEditing(t)} className="text-muted-foreground hover:text-foreground cursor-pointer transition shrink-0"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(t)} disabled={busyId === t.id} className="text-muted-foreground hover:text-red-400 cursor-pointer transition shrink-0"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && <DocumentTypeForm initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSaved={refresh} />}
    </div>
  );
}
