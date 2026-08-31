"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, X, ChevronDown, ChevronUp, Users } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

function toDateInputValue(v) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

function CouponForm({ initial, onClose, onSaved }) {
  const [form, setForm] = useState({
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
      const url = initial ? `/api/platform/coupons/${initial.id}` : "/api/platform/coupons";
      const body = {
        code: form.code, discountType: form.discountType, discountValue: form.discountValue,
        maxRedemptions: form.maxRedemptions === "" ? null : Number(form.maxRedemptions),
        validFrom: form.validFrom || null, validUntil: form.validUntil || null, status: form.status,
      };
      const res = await apiFetch(url, { method: initial ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save.");
      toast.success(initial ? "Coupon updated." : "Coupon created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <ModalFocusTrap>
      <form onSubmit={save} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={initial ? "Edit Coupon" : "New Coupon"} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-foreground font-medium">{initial ? "Edit Coupon" : "New Coupon"}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Code</label>
            <input required disabled={!!initial} aria-label="Coupon code" placeholder="e.g. SAVE20" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className={`${inputClass} uppercase disabled:opacity-60`} />
            {initial && <p className="text-muted-foreground text-[11px] mt-1">Code can't be changed after creation — deactivate and create a new one instead.</p>}
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
          <select aria-label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
            <option value="active">Active — usable at checkout</option>
            <option value="inactive">Inactive — hidden from checkout</option>
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

function DeleteButton({ coupon, onDeleted }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/coupons/${coupon.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete.");
      toast.success("Coupon deleted.");
      onDeleted();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }
  return (
    <button onClick={remove} disabled={busy} aria-label={`Delete coupon ${coupon.code}`} className="text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60 transition">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

function formatDiscount(coupon) {
  return coupon.discount_type === "percent" ? `${Number(coupon.discount_value)}% off` : `₹${Number(coupon.discount_value).toLocaleString()} off`;
}

function RedemptionsPanel({ couponId }) {
  const [loading, setLoading] = useState(true);
  const [redemptions, setRedemptions] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`/api/platform/coupons/${couponId}/redemptions`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load redemptions.");
        if (!cancelled) setRedemptions(data.redemptions);
      } catch (err) { if (!cancelled) setError(err.message); } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [couponId]);

  if (loading) return <div className="px-4 pb-4 flex items-center gap-2 text-muted-foreground text-xs"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading redemptions…</div>;
  if (error) return <p className="px-4 pb-4 text-red-400 text-xs">{error}</p>;
  if (redemptions.length === 0) return <p className="px-4 pb-4 text-muted-foreground text-xs">Not redeemed by anyone yet.</p>;

  return (
    <div className="px-4 pb-4">
      <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
        {redemptions.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
            <span className="text-foreground truncate">{r.company_name || `Company #${r.company_id}`}</span>
            <span className="text-muted-foreground shrink-0">₹{Number(r.discount_amount).toLocaleString()} off · {new Date(r.redeemed_at).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CouponsManager({ coupons }) {
  const router = useRouter();
  const [editing, setEditing] = useState(undefined);
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button onClick={() => setEditing(null)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer">
          <Plus className="h-3.5 w-3.5" /> New Coupon
        </button>
      </div>
      {coupons.length === 0 ? (
        <p className="text-muted-foreground text-sm bg-card border border-border rounded-xl p-6 text-center">No coupons yet.</p>
      ) : (
        <div className="bg-card border border-border rounded-xl divide-y divide-border">
          {coupons.map((c) => (
            <div key={c.id}>
              <div className="flex items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-foreground text-sm font-medium font-mono">{c.code}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${c.status === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-border text-muted-foreground"}`}>{c.status}</span>
                  </div>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {formatDiscount(c)} · used {c.redemption_count}{c.max_redemptions ? ` / ${c.max_redemptions}` : ""}
                    {c.valid_until ? ` · expires ${toDateInputValue(c.valid_until)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {c.redemption_count > 0 && (
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} aria-label={`${expanded === c.id ? "Hide" : "Show"} who redeemed ${c.code}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer text-[11px]">
                      <Users className="h-3.5 w-3.5" /> Used by {expanded === c.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
                  )}
                  <button onClick={() => setEditing(c)} aria-label={`Edit coupon ${c.code}`} className="text-muted-foreground hover:text-foreground cursor-pointer"><Pencil className="h-3.5 w-3.5" /></button>
                  <DeleteButton coupon={c} onDeleted={() => router.refresh()} />
                </div>
              </div>
              {expanded === c.id && <RedemptionsPanel couponId={c.id} />}
            </div>
          ))}
        </div>
      )}
      {editing !== undefined && (
        <CouponForm initial={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); router.refresh(); }} />
      )}
    </div>
  );
}
