"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { PERMISSION_MODULE_ORDER, PERMISSION_MODULE_LABELS } from "@/lib/constants/permissionModules";
import { apiFetch } from "@/components/shared/apiClient";

export default function PermissionMatrix({ roleId, allPermissions, assignedIds }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(assignedIds));
  const [saving, setSaving] = useState(false);
  const grouped = useMemo(() => { const m = {}; allPermissions.forEach((p) => { (m[p.module] ||= []).push(p); }); return m; }, [allPermissions]);
  const modules = [...PERMISSION_MODULE_ORDER.filter((m) => grouped[m]), ...Object.keys(grouped).filter((m) => !PERMISSION_MODULE_ORDER.includes(m))];

  function toggle(id) { setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  async function handleSave() {
    setSaving(true);
    try { const res = await apiFetch(`/api/core/roles/${roleId}/permissions`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ permissionIds: Array.from(selected) }) }); if (!res.ok) throw new Error(); toast.success("Saved."); router.refresh(); }
    catch { toast.error("Failed."); } finally { setSaving(false); }
  }
  return (
    <div>
      <div className="flex justify-end mb-4"><button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button></div>
      <div className="space-y-4">
        {modules.map((m) => (
          <div key={m} className="bg-card border border-border rounded-xl p-4">
            <p className="text-foreground text-sm font-medium mb-3">{PERMISSION_MODULE_LABELS[m] || m}</p>
            <div className="flex flex-wrap gap-2">
              {grouped[m].map((p) => { const active = selected.has(p.id); return (
                <button key={p.id} type="button" onClick={() => toggle(p.id)} aria-pressed={active} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border cursor-pointer transition ${active ? "bg-emerald-600/10 text-emerald-400 border-emerald-600/30 hover:border-emerald-500/50" : "bg-red-600/10 text-red-400 border-red-600/30 hover:border-red-500/50"}`}>
                  {active ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}{p.name}
                </button>
              ); })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}