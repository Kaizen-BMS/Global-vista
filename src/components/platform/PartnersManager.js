"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp, Users, IndianRupee, Handshake } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

function toDateInputValue(v) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}
function formatMoney(n) {
  return `₹${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
      <span className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0"><Icon className="h-4 w-4" /></span>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-foreground text-lg font-semibold tabular-nums truncate">{value}</p>
      </div>
    </div>
  );
}

function PartnerForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    email: initial?.email || "",
    phone: initial?.phone || "",
    notes: initial?.notes || "",
    code: initial?.code || "",
    discountType: initial?.discount_type || "percent",
    discountValue: initial?.discount_value ?? "",
    maxRedemptions: initial?.max_redemptions ?? "",
    validFrom: toDateInputValue(initial?.valid_from),
    validUntil: toDateInputValue(initial?.valid_until),
    status: initial?.status || "active",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = initial ? `/api/platform/partners/${initial.id}` : "/api/platform/partners";
      const body = {
        name: form.name, email: form.email || null, phone: form.phone || null, notes: form.notes || null,
        code: form.code, discountType: form.discountType, discountValue: form.discountValue,
        maxRedemptions: form.maxRedemptions === "" ? null : Number(form.maxRedemptions),
        validFrom: form.validFrom || null, validUntil: form.validUntil || null, status: form.status,
      };
      const res = await apiFetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      toast.success(initial ? "Partner updated." : "Partner added.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={initial ? "Edit Partner" : "New Partner"} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{initial ? "Edit Partner" : "New Partner"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Partner Name</label>
            <input required placeholder="e.g. Priya Sharma (Influencer)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Email (optional)</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Phone (optional)</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Referral Code</label>
            <input required disabled={!!initial} aria-label="Referral code" placeholder="e.g. PRIYA20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={`${inputClass} uppercase disabled:opacity-60`} />
            <p className="text-muted-foreground text-[11px] mt-1">{initial ? "Code can't be changed after creation — deactivate and add a new partner instead." : "This is the code the partner shares — it works as a real coupon at checkout, and every use is tracked back to them."}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Discount Type</label>
              <select aria-label="Discount type" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className={inputClass}>
                <option value="percent">Percent off</option>
                <option value="fixed">Fixed amount off</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Discount Value</label>
              <input required type="number" min="0" step="0.01" aria-label="Discount value" placeholder={form.discountType === "percent" ? "e.g. 20" : "e.g. 500"} value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Max Redemptions (optional)</label>
            <input type="number" min="1" aria-label="Max redemptions" placeholder="Unlimited" value={form.maxRedemptions} onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value })} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Valid From (optional)</label>
              <input type="date" aria-label="Valid from" value={form.validFrom} onChange={(e) => setForm({ ...form, validFrom: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Valid Until (optional)</label>
              <input type="date" aria-label="Valid until" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Notes (optional)</label>
            <textarea rows={2} placeholder="e.g. Instagram handle, agreed commission, etc." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputClass} />
          </div>
          <select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="active">Active — code usable at checkout</option>
            <option value="inactive">Inactive — code disabled</option>
          </select>
        </div>
        <button type="submit" disabled={saving} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </form>
      </ModalFocusTrap>
    </div>
  );
}

function DeletePartnerButton({ partner, onDeleted }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete partner "${partner.name}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/partners/${partner.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      toast.success("Partner deleted.");
      onDeleted();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <button onClick={remove} disabled={busy} aria-label={`Delete partner ${partner.name}`} className="text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

function formatDiscount(p) {
  return p.discount_type === "percent" ? `${Number(p.discount_value)}% off` : `₹${Number(p.discount_value).toLocaleString()} off`;
}

function RedemptionsPanel({ partnerId }) {
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/platform/partners/${partnerId}/detail`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load.");
        if (!cancelled) setRedemptions(data.redemptions || []);
      } catch (err) { if (!cancelled) setError(err.message); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [partnerId]);

  if (loading) return <div className="px-4 pb-4 flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading referred companies…</div>;
  if (error) return <p className="px-4 pb-4 text-red-400 text-xs">{error}</p>;
  if (redemptions.length === 0) return <p className="px-4 pb-4 text-muted-foreground text-xs">No signups from this partner's code yet.</p>;

  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        <div className="flex items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground bg-muted/40">
          <span>Company</span><span>Lifetime revenue</span>
        </div>
        {redemptions.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="text-foreground truncate">{r.company_name || `Company #${r.company_id}`}</p>
              <p className="text-muted-foreground">Signed up {new Date(r.redeemed_at).toLocaleDateString()} · {formatMoney(r.discount_amount)} discount given</p>
            </div>
            <span className="text-emerald-400 font-medium shrink-0">{formatMoney(r.company_revenue)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PartnersManager({ partners }) {
  const router = useRouter();
  const [editing, setEditing] = useState(undefined);
  const [expanded, setExpanded] = useState(null);

  const totalRedemptions = partners.reduce((sum, p) => sum + Number(p.redemption_count || 0), 0);
  const totalRevenue = partners.reduce((sum, p) => sum + Number(p.revenue || 0), 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Handshake} label="Partners" value={partners.length} />
        <StatCard icon={Users} label="Total Signups Referred" value={totalRedemptions} />
        <StatCard icon={IndianRupee} label="Revenue Attributed" value={formatMoney(totalRevenue)} />
      </div>

      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New Partner
        </button>
      </div>

      {partners.length === 0 ? (
        <p className="text-muted-foreground text-sm bg-card border border-border rounded-xl p-6 text-center">No partners yet — add one to give them a trackable referral code.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {partners.map((p) => (
            <div key={p.id}>
              <div className="flex items-center gap-3 p-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-foreground text-sm font-medium">{p.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground font-mono">{p.code}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${p.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}>{p.status}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {formatDiscount(p)} · {p.companies_referred || 0} signup{p.companies_referred === 1 ? "" : "s"}{p.max_redemptions ? ` / ${p.max_redemptions} max` : ""} · <span className="text-emerald-400">{formatMoney(p.revenue)} revenue</span>
                  </p>
                  {(p.email || p.phone) && <p className="text-muted-foreground text-[11px] mt-0.5">{[p.email, p.phone].filter(Boolean).join(" · ")}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setExpanded(expanded === p.id ? null : p.id)} aria-label={`${expanded === p.id ? "Hide" : "Show"} companies referred by ${p.name}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer text-[11px]">
                    Details {expanded === p.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  <button onClick={() => setEditing(p)} aria-label={`Edit partner ${p.name}`} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <DeletePartnerButton partner={p} onDeleted={() => router.refresh()} />
                </div>
              </div>
              {expanded === p.id && <RedemptionsPanel partnerId={p.id} />}
            </div>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <PartnerForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />
      )}
    </div>
  );
}
