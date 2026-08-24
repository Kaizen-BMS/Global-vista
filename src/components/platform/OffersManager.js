"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Plus } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

function OfferRow({ offer, index, total, onRefresh, onMove }) {
  const [busy, setBusy] = useState(false);

  async function toggleStatus() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/offers/${offer.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: offer.text, status: offer.status === "active" ? "inactive" : "active" }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update.");
      onRefresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function remove() {
    if (!confirm("Delete this offer? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/offers/${offer.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete.");
      toast.success("Offer deleted.");
      onRefresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function move(direction) {
    setBusy(true);
    try {
      await onMove(direction === "up" ? index - 1 : index + 1, index);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
      <p className={`flex-1 min-w-0 text-sm text-foreground truncate ${offer.status === "inactive" ? "opacity-50" : ""}`}>{offer.text}</p>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={() => move("up")} disabled={busy || index === 0} aria-label="Move earlier" className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40 transition"><ArrowUp className="h-3.5 w-3.5" /></button>
        <button onClick={() => move("down")} disabled={busy || index === total - 1} aria-label="Move later" className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40 transition"><ArrowDown className="h-3.5 w-3.5" /></button>
        <button onClick={toggleStatus} disabled={busy} aria-label={offer.status === "active" ? "Hide from homepage" : "Show on homepage"} className="p-1.5 rounded-md bg-muted hover:bg-accent text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-40 transition">
          {offer.status === "active" ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        </button>
        <button onClick={remove} disabled={busy} aria-label={`Delete offer "${offer.text}"`} className="p-1.5 rounded-md bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-40 transition">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function OffersManager({ offers }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/platform/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: trimmed }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add offer.");
      toast.success("Offer added.");
      setText("");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  async function reorder(newIndex, oldIndex) {
    if (newIndex < 0 || newIndex >= offers.length) return;
    const next = [...offers];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    try {
      const res = await apiFetch("/api/platform/offers/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: next.map((o) => o.id) }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to reorder.");
      router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-center gap-2 mb-4 bg-card border border-border rounded-xl p-4">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder='e.g. "20% off annual plans this month"' maxLength={300} className="flex-1 min-w-[220px] px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
        <button type="submit" disabled={saving || !text.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add Offer
        </button>
      </form>
      {offers.length === 0 ? (
        <p className="text-muted-foreground text-sm bg-card border border-border rounded-xl p-6 text-center">No offers yet — add one to show it in the scrolling strip on the homepage.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {offers.map((o, i) => (
            <OfferRow key={o.id} offer={o} index={i} total={offers.length} onRefresh={() => router.refresh()} onMove={reorder} />
          ))}
        </div>
      )}
    </div>
  );
}
