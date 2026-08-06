"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
function slugify(n) { return n.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function ManagedListEditor({ title, apiBase, items }) {
  const router = useRouter(); const [name, setName] = useState(""); const [saving, setSaving] = useState(false); const [deletingId, setDeletingId] = useState(null);
  async function handleAdd(e) {
    e.preventDefault(); if (!name.trim()) return; setSaving(true);
    try { const res = await apiFetch(apiBase, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), slug: slugify(name) }) }); if (!res.ok) throw new Error(); setName(""); router.refresh(); }
    catch { toast.error("Failed."); } finally { setSaving(false); }
  }
  async function handleDelete(id) {
    setDeletingId(id);
    try { const res = await apiFetch(`${apiBase}/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); router.refresh(); }
    catch { toast.error("Failed."); } finally { setDeletingId(null); }
  }
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-xl">
      <h2 className="text-white font-medium mb-4">{title}</h2>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`New ${title.toLowerCase()}`} className="flex-1 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
        <button type="submit" disabled={saving} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button>
      </form>
      <ul className="divide-y divide-neutral-800">{items.map((i) => <li key={i.id} className="flex items-center justify-between py-2"><span className="text-neutral-300 text-sm">{i.name}</span><button onClick={() => handleDelete(i.id)} disabled={deletingId === i.id} className="text-neutral-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button></li>)}</ul>
    </div>
  );
}