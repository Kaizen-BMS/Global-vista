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
          {/* Icon and toggle share a small top row (both fixed-size, always
              enough room, so this row never breaks); the label gets the
              FULL card width on its own line below instead of fighting
              the toggle for space in the same row — that's what kept
              breaking, at any card width, once a name was long enough:
              cramming icon+label+toggle into one row means the label's
              available width shrinks with the card AND the toggle's own
              width, so even short names ("CRM") eventually run out of
              room. Giving the label the whole row removes that
              competition entirely. break-words stays as a safety net for
              a name too long to fit even alone on its own line. */}
          <div className="flex items-center justify-between mb-2">
            <Icon className="h-4 w-4 text-indigo-400 shrink-0" />
            <label className="relative inline-flex items-center shrink-0 cursor-pointer"><input type="checkbox" checked={!!mod.enabled} disabled={busyId === mod.id} onChange={() => toggle(mod)} className="sr-only peer" /><div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600"></div><div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div></label>
          </div>
          <p className="text-foreground font-medium break-words">{mod.name}</p>
          <p className="text-muted-foreground text-xs mt-1">{mod.category}</p>
          {!["crm", "payments"].includes(mod.slug) && mod.enabled && <p className="text-yellow-400 text-[10px] mt-2">Catalog entry — business logic not yet built.</p>}
        </div>
      ); })}
    </div>
  );
}