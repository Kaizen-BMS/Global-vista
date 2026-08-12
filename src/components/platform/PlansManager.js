"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const emptyForm = { name: "", billingCycle: "monthly", maxUsers: "", maxStorageMb: "", maxApiCallsPerDay: "", status: "active" };

function PlanForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, billingCycle: initial.billing_cycle, maxUsers: initial.max_users || "",
    maxStorageMb: initial.max_storage_mb || "", maxApiCallsPerDay: initial.max_api_calls_per_day || "", status: initial.status,
  } : emptyForm);
  const [saving, setSaving] = useState(false);
  const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initial ? `/api/platform/plans/${initial.id}` : "/api/platform/plans";
      const res = await apiFetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      toast.success(initial ? "Plan updated." : "Plan created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{initial ? "Edit" : "New"} Plan</h2>
          <button type="button" onClick={onClose} className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <input required placeholder="Plan name (e.g. Professional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className={inputClass}>
            <option value="trial">Trial</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
          </select>
          <input type="number" min="0" placeholder="Max users (blank = unlimited)" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Storage limit in MB (blank = unlimited)" value={form.maxStorageMb} onChange={(e) => setForm({ ...form, maxStorageMb: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max API calls/day (blank = unlimited)" value={form.maxApiCallsPerDay} onChange={(e) => setForm({ ...form, maxApiCallsPerDay: e.target.value })} className={inputClass} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </form>
    </div>
  );
}

export default function PlansManager({ plans }) {
  const router = useRouter();
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New Plan
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {plans.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-foreground font-medium">{p.name}</p>
              <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
            </div>
            <p className="text-muted-foreground text-xs mb-2 capitalize">{p.billing_cycle} · {p.status}</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>Users: {p.max_users || "Unlimited"}</p>
              <p>Storage: {p.max_storage_mb ? `${p.max_storage_mb} MB` : "Unlimited"}</p>
            </div>
          </div>
        ))}
      </div>
      {editing !== undefined && (
        <PlanForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />
      )}
    </div>
  );
}
