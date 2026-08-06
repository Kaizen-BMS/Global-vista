"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check } from "lucide-react";
import { PERMISSION_MODULE_ORDER, PERMISSION_MODULE_LABELS } from "@/lib/constants/permissionModules";
import { apiFetch } from "@/components/crm/shared/apiClient";

const ACTION_LABELS = {
  view: "View", create: "Create", update: "Edit", delete: "Delete",
  assign: "Assign", export: "Export", manage: "Manage",
};

function parseAction(slug) {
  const [, action] = slug.split(".");
  return action;
}

export default function PermissionMatrix({ roleId, allPermissions, assignedIds }) {
  const router = useRouter();
  const [selected, setSelected] = useState(new Set(assignedIds));
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    const map = {};
    for (const perm of allPermissions) {
      map[perm.module] = map[perm.module] || [];
      map[perm.module].push(perm);
    }
    return map;
  }, [allPermissions]);

  const modules = [
    ...PERMISSION_MODULE_ORDER.filter((m) => grouped[m]),
    ...Object.keys(grouped).filter((m) => !PERMISSION_MODULE_ORDER.includes(m)),
  ];

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleModule(moduleKey) {
    const ids = grouped[moduleKey].map((p) => p.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(allPermissions.map((p) => p.id)));
  }

  function deselectAll() {
    setSelected(new Set());
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/roles/${roleId}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: Array.from(selected) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Permissions updated.");
      router.refresh();
    } catch {
      toast.error("Failed to update permissions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 text-sm">
          <button onClick={selectAll} className="text-indigo-400 hover:text-indigo-300">Select All</button>
          <button onClick={deselectAll} className="text-neutral-400 hover:text-white">Deselect All</button>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Permissions
        </button>
      </div>

      <div className="space-y-4">
        {modules.map((moduleKey) => {
          const perms = grouped[moduleKey];
          const allSelected = perms.every((p) => selected.has(p.id));
          return (
            <div key={moduleKey} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
                <p className="text-white text-sm font-medium">
                  {PERMISSION_MODULE_LABELS[moduleKey] || moduleKey}
                </p>
                <button
                  onClick={() => toggleModule(moduleKey)}
                  className="text-xs text-indigo-400 hover:text-indigo-300"
                >
                  {allSelected ? "Clear module" : "Select module"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 p-4">
                {perms.map((perm) => {
                  const active = selected.has(perm.id);
                  const action = parseAction(perm.slug);
                  return (
                    <button
                      key={perm.id}
                      type="button"
                      onClick={() => toggle(perm.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition ${
                        active
                          ? "bg-indigo-600/10 text-indigo-400 border-indigo-600/30"
                          : "bg-neutral-800/60 text-neutral-400 border-neutral-800 hover:text-white"
                      }`}
                    >
                      {active && <Check className="h-3 w-3" />}
                      {ACTION_LABELS[action] || perm.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}