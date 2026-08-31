"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, Plus, ImagePlus, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const MAX_IMAGE_MB = 5;

async function uploadOfferImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await apiFetch("/api/platform/offers/upload", { method: "POST", body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to upload image.");
  return data.url;
}

function OfferRow({ offer, index, total, onRefresh, onMove }) {
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  async function toggleStatus() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/offers/${offer.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: offer.text, imageUrl: offer.image_url || null, status: offer.status === "active" ? "inactive" : "active" }) });
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

  async function handleImagePick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`Image must be under ${MAX_IMAGE_MB}MB.`); return; }
    setBusy(true);
    try {
      const url = await uploadOfferImage(file);
      const res = await apiFetch(`/api/platform/offers/${offer.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: offer.text, imageUrl: url, status: offer.status }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update.");
      toast.success("Banner image updated.");
      onRefresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  async function removeImage() {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/platform/offers/${offer.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: offer.text, imageUrl: null, status: offer.status }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update.");
      onRefresh();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
      {offer.image_url ? (
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={offer.image_url} alt="" className={`h-10 w-16 object-cover rounded-md border border-border ${offer.status === "inactive" ? "opacity-50" : ""}`} />
          <button onClick={removeImage} disabled={busy} aria-label="Remove banner image" className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white cursor-pointer disabled:opacity-40">
            <X className="h-2.5 w-2.5" />
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={busy} aria-label="Add banner image" className="shrink-0 h-10 w-16 flex items-center justify-center rounded-md border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-accent cursor-pointer disabled:opacity-40 transition">
          <ImagePlus className="h-4 w-4" />
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={handleImagePick} />
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  function pickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) { toast.error(`Image must be under ${MAX_IMAGE_MB}MB.`); e.target.value = ""; return; }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleAdd(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      let imageUrl = null;
      if (imageFile) imageUrl = await uploadOfferImage(imageFile);
      const res = await apiFetch("/api/platform/offers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: trimmed, imageUrl }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add offer.");
      toast.success("Offer added.");
      setText("");
      clearImage();
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
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hidden onChange={pickImage} />
        {imagePreview ? (
          <div className="relative shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="" className="h-9 w-14 object-cover rounded-md border border-border" />
            <button type="button" onClick={clearImage} aria-label="Remove selected image" className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500 text-white cursor-pointer">
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted hover:bg-accent border border-border text-muted-foreground hover:text-foreground text-xs cursor-pointer transition">
            <ImagePlus className="h-3.5 w-3.5" /> Festival banner image
          </button>
        )}
        <button type="submit" disabled={saving || !text.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer transition disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Add Offer
        </button>
      </form>
      <p className="text-muted-foreground text-xs mb-4 -mt-2">The pricing-page banner shows the image when one is set, otherwise just the text. The scrolling strip at the top of the homepage always shows text only.</p>
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
