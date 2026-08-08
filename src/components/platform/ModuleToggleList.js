"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function ModuleToggleList({ companyId, modules }) {
  const router = useRouter(); const [busyId, setBusyId] = useState(null);
  async function toggle(mod) {
    setBusyId(mod.id);
    try { await apiFetch(`/api/platform/companies/${companyId}/modules`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId: mod.id, enabled: !mod.enabled }) }); toast.success(`${mod.name} ${!mod.enabled ? "enabled" : "disabled"}.`); router.refresh(); }
    catch { toast.error("Failed."); } finally { setBusyId(null); }
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((mod) => { const Icon = Icons[mod.icon] || Icons.Package; return (
        <div key={mod.id} className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Icon className="h-4 w-4 text-indigo-400" /><p className="text-foreground font-medium">{mod.name}</p></div>
            <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" checked={!!mod.enabled} disabled={busyId === mod.id} onChange={() => toggle(mod)} className="sr-only peer" /><div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600"></div><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div></label>
          </div>
          <p className="text-muted-foreground text-xs">{mod.category}</p>
          {mod.slug !== "crm" && mod.enabled && <p className="text-yellow-400 text-[10px] mt-2">Catalog entry — business logic not yet built.</p>}
        </div>
      ); })}
    </div>
  );
}