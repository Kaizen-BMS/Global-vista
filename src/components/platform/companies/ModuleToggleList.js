"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

export default function ModuleToggleList({ companyId, modules }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);

  async function toggle(mod) {
    setBusyId(mod.id);
    try {
      const res = await apiFetch(`/api/platform/companies/${companyId}/modules`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moduleId: mod.id, enabled: !mod.enabled }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${mod.name} ${!mod.enabled ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch {
      toast.error("Failed to update module.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {modules.map((mod) => {
        const Icon = Icons[mod.icon] || Icons.Package;
        const isCrm = mod.slug === "crm";
        return (
          <div key={mod.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-indigo-400" />
                <p className="text-white font-medium">{mod.name}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!mod.enabled}
                  disabled={busyId === mod.id}
                  onChange={() => toggle(mod)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-neutral-700 rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4"></div>
              </label>
            </div>
            <p className="text-neutral-500 text-xs">{mod.category}</p>
            {!isCrm && mod.enabled && (
              <p className="text-yellow-400 text-[10px] mt-2">Catalog entry — not yet functionally implemented.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}