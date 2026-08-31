"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Loader2, X, Check, Trash2, Link2, CalendarRange } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const emptyForm = {
  name: "", description: "", billingCycle: "monthly", pricingModel: "flat", price: "", maintenanceAnnualFee: "", currency: "INR", trialDays: "",
  maxUsers: "", maxLeads: "", maxStorageMb: "", maxApiCallsPerDay: "", status: "active",
  registrationLabel: "Self", developmentCostLabel: "Free", installationCostLabel: "Free", allowImportExport: true,
};

function PlanForm({ initial, allModules, planModulesByPlan, onClose, onSaved }) {
  const [form, setForm] = useState(initial ? {
    name: initial.name, description: initial.description || "", billingCycle: initial.billing_cycle,
    pricingModel: initial.pricing_model || "flat", price: initial.price || "", maintenanceAnnualFee: initial.maintenance_annual_fee || "",
    currency: initial.currency || "INR", trialDays: initial.trial_days || "",
    maxUsers: initial.max_users || "", maxLeads: initial.max_leads || "",
    maxStorageMb: initial.max_storage_mb || "", maxApiCallsPerDay: initial.max_api_calls_per_day || "", status: initial.status,
    registrationLabel: initial.registration_label || "Self", developmentCostLabel: initial.development_cost_label || "Free",
    installationCostLabel: initial.installation_cost_label || "Free", allowImportExport: initial.allow_import_export !== 0,
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
          <div>
            <label className="block text-muted-foreground text-xs mb-1">Pricing Model</label>
            <select value={form.pricingModel} onChange={(e) => setForm({ ...form, pricingModel: e.target.value })} className={inputClass}>
              <option value="flat">Flat — one price for the whole company</option>
              <option value="per_user">Per User — price × active employee count</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" min="0" step="0.01" placeholder={form.pricingModel === "per_user" ? "Price per user (blank = free)" : "Price (blank = free)"} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputClass} />
            <input placeholder="Currency" maxLength={10} value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className={inputClass} />
          </div>
          <input type="number" min="0" step="0.01" placeholder="Annual maintenance fee (blank = none)" value={form.maintenanceAnnualFee} onChange={(e) => setForm({ ...form, maintenanceAnnualFee: e.target.value })} className={inputClass} />
          {form.pricingModel === "per_user" && (
            <p className="text-muted-foreground text-[11px] -mt-1.5">Billed as a real, separate Razorpay recurring plan alongside the per-user charge — sync both from the plan card once saved.</p>
          )}
          <input type="number" min="0" placeholder="Trial length in days (blank = no trial)" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max users (blank = unlimited)" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max leads (blank = unlimited)" value={form.maxLeads} onChange={(e) => setForm({ ...form, maxLeads: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Storage limit in MB (blank = unlimited)" value={form.maxStorageMb} onChange={(e) => setForm({ ...form, maxStorageMb: e.target.value })} className={inputClass} />
          <input type="number" min="0" placeholder="Max API calls/day (blank = unlimited)" value={form.maxApiCallsPerDay} onChange={(e) => setForm({ ...form, maxApiCallsPerDay: e.target.value })} className={inputClass} />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="active">Active</option><option value="inactive">Inactive</option>
          </select>

          <div>
            <p className="text-foreground text-sm font-medium mb-2">Pricing Page Labels</p>
            <p className="text-muted-foreground text-xs mb-2">Shown as comparison rows on the pricing page — usually "Free"/"Self", but editable per plan.</p>
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Registration" value={form.registrationLabel} onChange={(e) => setForm({ ...form, registrationLabel: e.target.value })} className={inputClass} />
              <input placeholder="Dev. Cost" value={form.developmentCostLabel} onChange={(e) => setForm({ ...form, developmentCostLabel: e.target.value })} className={inputClass} />
              <input placeholder="Install Cost" value={form.installationCostLabel} onChange={(e) => setForm({ ...form, installationCostLabel: e.target.value })} className={inputClass} />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={form.allowImportExport} onChange={(e) => setForm({ ...form, allowImportExport: e.target.checked })} />
            Allow lead import/export on this plan
          </label>

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
  const maintenancePending = Number(plan.maintenance_annual_fee) > 0 && !plan.maintenance_razorpay_plan_id;
  if (plan.razorpay_plan_id && !maintenancePending) {
    return <span className="flex items-center gap-1 text-[11px] text-emerald-400"><Check className="h-3 w-3" /> Synced to Razorpay{plan.maintenance_razorpay_plan_id ? " (+ maintenance)" : ""}</span>;
  }
  if (!(Number(plan.price) > 0) && !maintenancePending) return null; // free/trial plans are never synced
  return (
    <button onClick={sync} disabled={busy} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Sync to Razorpay
    </button>
  );
}

/**
 * Hostinger-style commitment tiers — the plan's own `price` field always
 * stays the 1-month price (untouched, so every existing checkout/dashboard
 * still works); this only adds OPTIONAL longer tiers with their own
 * manually-set price. No discount formula — the operator types every
 * tier's price directly, exactly like the real Hostinger backend does.
 */
function DurationPricingEditor({ plan, tiers }) {
  const router = useRouter();
  const [months, setMonths] = useState("");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);

  async function addTier(e) {
    e.preventDefault();
    if (!months || !price) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/platform/plans/${plan.id}/duration-prices`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ durationMonths: Number(months), price: Number(price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      toast.success(`${months}-month tier saved.`);
      setMonths(""); setPrice("");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  async function removeTier(id) {
    if (!confirm("Remove this duration tier?")) return;
    try {
      const res = await apiFetch(`/api/platform/plans/${plan.id}/duration-prices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove.");
      router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  if (!(Number(plan.price) > 0)) return null; // free/trial plans don't offer commitment tiers

  const DURATION_LABELS = { 3: "Quarterly", 6: "Half-yearly", 12: "Yearly", 24: "2 years", 36: "3 years" };
  const configuredMonths = new Set(tiers.map((t) => t.duration_months));

  return (
    <div className="pt-2 mt-2 border-t border-border">
      <p className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium mb-1.5"><CalendarRange className="h-3 w-3" /> Commitment Pricing (per {plan.pricing_model === "per_user" ? "user, " : ""}month)</p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
        <span>1 month (default)</span><span>{plan.currency} {plan.price}</span>
      </div>
      {tiers.map((t) => (
        <div key={t.id} className="flex items-center justify-between text-[11px] text-foreground mb-1.5">
          <span>{DURATION_LABELS[t.duration_months] ? `${DURATION_LABELS[t.duration_months]} (${t.duration_months}mo)` : `${t.duration_months} months`}</span>
          <span className="flex items-center gap-1.5">
            {plan.currency} {t.price}
            <button onClick={() => removeTier(t.id)} aria-label={`Remove ${t.duration_months}-month tier`} className="text-muted-foreground hover:text-red-400 cursor-pointer"><Trash2 className="h-3 w-3" /></button>
          </span>
        </div>
      ))}
      <div className="flex flex-wrap gap-1 mt-2">
        {Object.entries(DURATION_LABELS).filter(([m]) => !configuredMonths.has(Number(m))).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMonths(m)} className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer transition ${months === m ? "border-indigo-500 bg-indigo-500/10 text-foreground" : "border-border text-muted-foreground hover:border-indigo-500/30"}`}>
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={addTier} className="flex items-center gap-1.5 mt-2">
        <input type="number" min="2" placeholder="Months" value={months} onChange={(e) => setMonths(e.target.value)} className="w-16 px-1.5 py-1 rounded bg-muted border border-border text-foreground text-[11px]" />
        <input type="number" min="0" step="0.01" placeholder={`${plan.currency}/mo`} value={price} onChange={(e) => setPrice(e.target.value)} className="w-20 px-1.5 py-1 rounded bg-muted border border-border text-foreground text-[11px]" />
        <button type="submit" disabled={saving || !months || !price} className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] cursor-pointer disabled:opacity-50">
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
        </button>
      </form>
    </div>
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

export default function PlansManager({ plans, allModules = [], planModulesByPlan = {}, durationPricesByPlan = {} }) {
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
                <p>{p.pricing_model === "per_user" ? "Per user" : "Price"}: {p.price ? `${p.currency} ${p.price}${p.pricing_model === "per_user" ? "/user/mo" : ""}` : "Free"}</p>
                {!!p.maintenance_annual_fee && <p>Maintenance: {p.currency} {p.maintenance_annual_fee}/yr</p>}
                {!!p.trial_days && <p>Trial: {p.trial_days} days</p>}
                <p>Users: {p.max_users || "Unlimited"}</p>
                <p>Leads: {p.max_leads || "Unlimited"}</p>
                <p>Storage: {p.max_storage_mb ? `${p.max_storage_mb} MB` : "Unlimited"}</p>
                <p>Import/Export: {p.allow_import_export === 0 ? "No" : "Yes"}</p>
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
              <div className="pt-0">
                <DurationPricingEditor plan={p} tiers={durationPricesByPlan[p.id] || []} />
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
