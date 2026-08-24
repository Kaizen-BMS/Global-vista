"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, X, Check, Trash2, Link2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const emptyForm = { name: "", description: "", billingCycle: "monthly", price: "", currency: "INR", trialDays: "", maxUsers: "", maxLeads: "", maxStorageMb: "", maxApiCallsPerDay: "", status: "active" };

function PlanForm({ initial, allModules, planModulesByPlan, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, description: initial.description || "", billingCycle: initial.billing_cycle, price: initial.price || "", currency: initial.currency || "INR", trialDays: initial.trial_days || "",
    maxUsers: initial.max_users || "", maxLeads: initial.max_leads || "",
    maxStorageMb: initial.max_storage_mb || "", maxApiCallsPerDay: initial.max_api_calls_per_day || "", status: initial.status,
  } : emptyForm);
  const [moduleIds, setModuleIds] = useState(new Set(initial ? (planModulesByPlan[initial.id] || []) : []));
  const [saving, setSaving] = useState(false);
  const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function toggleModule(id) {
    setModuleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initial ? `/api/platform/plans/${initial.id}` : "/api/platform/plans";
      const res = await apiFetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      const planId = initial ? initial.id : data.id;

      const modRes = await apiFetch(`/api/platform/plans/${planId}/modules`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleIds: [...moduleIds] }) });
      if (!modRes.ok) throw new Error((await modRes.json()).error || "Plan saved, but modules failed to save.");

      toast.success(initial ? "Plan updated." : "Plan created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={`${initial ? "Edit" : "New"} Plan`} className="w-full max-w-md bg-card border border-border rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{initial ? "Edit" : "New"} Plan</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <input required placeholder="Plan name (e.g. Professional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          <textarea rows={2} placeholder="Description (shown to companies on the subscription page)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClass} />
          <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className={inputClass}>
            <option value="trial">Trial</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="0" step="0.01" placeholder="Price (blank = free)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
            <input placeholder="Currency" maxLength={10} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className={inputClass} />
          </div>
          <input type="number" min="0" placeholder="Trial length in days (blank = no trial)" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max users (blank = unlimited)" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max leads (blank = unlimited)" value={form.maxLeads} onChange={(e) => setForm({ ...form, maxLeads: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Storage limit in MB (blank = unlimited)" value={form.maxStorageMb} onChange={(e) => setForm({ ...form, maxStorageMb: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max API calls/day (blank = unlimited)" value={form.maxApiCallsPerDay} onChange={(e) => setForm({ ...form, maxApiCallsPerDay: e.target.value })} className={inputClass} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>

          <div>
            <p className="text-foreground text-sm font-medium mb-2">Included Modules</p>
            <p className="text-muted-foreground text-xs mb-2">Companies on this plan get exactly these modules — nothing not listed here is included.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {allModules.map((m) => (
                <label key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition ${moduleIds.has(m.id) ? "border-indigo-500 bg-indigo-500/10 text-foreground" : "border-border bg-muted/40 text-muted-foreground"}`}>
                  <input type="checkbox" checked={moduleIds.has(m.id)} onChange={() => toggleModule(m.id)} className="hidden" />
                  {moduleIds.has(m.id) ? <Check className="h-3 w-3 text-indigo-400 shrink-0" /> : <span className="h-3 w-3 shrink-0" />}
                  {m.name}
                </label>
              ))}
            </div>
          </div>
        </div>
        <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

function SyncToRazorpayButton({ plan, onSynced }) {
  const [busy, setBusy] = useState(false);
  async function sync() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/plans/${plan.id}/razorpay-sync`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sync.");
      toast.success(`"${plan.name}" synced to Razorpay.`);
      onSynced();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  if (plan.razorpay_plan_id) {
    return <span className="flex items-center gap-1 text-[11px] text-emerald-400"><Check className="h-3 w-3" /> Synced to Razorpay</span>;
  }
  if (!(Number(plan.price) > 0)) return null; // free/trial plans are never synced
  return (
    <button onClick={sync} disabled={busy} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Sync to Razorpay
    </button>
  );
}

function DeletePlanButton({ plan, onDeleted }) {
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete "${plan.name}"? If any company has ever been on this plan, it'll be archived (hidden from new assignments) instead of removed, so their billing history stays intact.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/plans/${plan.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete plan.");
      if (data.archived) toast.warning(`"${plan.name}" is used by ${data.companiesUsingIt} company subscription(s) — archived instead of deleted (set to inactive, hidden from new assignments).`);
      else toast.success(`"${plan.name}" deleted.`);
      onDeleted();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <button onClick={remove} disabled={busy} aria-label={`Delete plan ${plan.name}`} className="text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function PlansManager({ plans, allModules = [], planModulesByPlan = {} }) {
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
        {plans.map((p) => {
          const planModuleIds = new Set(planModulesByPlan[p.id] || []);
          const planModuleNames = allModules.filter((m) => planModuleIds.has(m.id)).map((m) => m.name);
          return (
            <div key={p.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-foreground font-medium">{p.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <DeletePlanButton plan={p} onDeleted={() => router.refresh()} />
                </div>
              </div>
              <p className="text-muted-foreground text-xs mb-2 capitalize">{p.billing_cycle} · {p.status}</p>
              {p.description && <p className="text-muted-foreground text-xs mb-2">{p.description}</p>}
              <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                <p>Price: {p.price ? `${p.currency} ${p.price}` : "Free"}</p>
                {!!p.trial_days && <p>Trial: {p.trial_days} days</p>}
                <p>Users: {p.max_users || "Unlimited"}</p>
                <p>Leads: {p.max_leads || "Unlimited"}</p>
                <p>Storage: {p.max_storage_mb ? `${p.max_storage_mb} MB` : "Unlimited"}</p>
              </div>
              <div className="flex flex-wrap gap-1 pt-2 border-t border-border">
                {planModuleNames.length === 0 ? (
                  <span className="text-muted-foreground text-[11px]">No modules assigned yet</span>
                ) : planModuleNames.map((name) => (
                  <span key={name} className="px-1.5 py-0.5 rounded text-[11px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{name}</span>
                ))}
              </div>
              <div className="pt-2 mt-2 border-t border-border">
                <SyncToRazorpayButton plan={p} onSynced={() => router.refresh()} />
              </div>
            </div>
          );
        })}
      </div>
      {editing !== undefined && (
        <PlanForm initial={editing} allModules={allModules} planModulesByPlan={planModulesByPlan} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />
      )}
    </div>
  );
}
