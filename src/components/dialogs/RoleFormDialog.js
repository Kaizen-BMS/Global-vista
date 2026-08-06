"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
function slugify(n) { return n.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

export default function RoleFormDialog({ role, onClose }) {
  const router = useRouter(); const isEdit = !!role;
  const [name, setName] = useState(role?.name || ""); const [description, setDescription] = useState(role?.description || ""); const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try {
      const res = await apiFetch(isEdit ? `/api/core/roles/${role.id}` : "/api/core/roles", { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(isEdit ? { name, description } : { name, description, slug: slugify(name) }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error);
      toast.success(isEdit ? "Updated." : "Created."); onClose(); router.refresh();
    } catch (e) { toast.error(e.message); } finally { setSaving(false); }
  }
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-white font-medium">{isEdit ? "Edit Role" : "Create Role"}</h2><button type="button" onClick={onClose}><X className="h-4 w-4 text-neutral-500" /></button></div>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full mb-4 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mb-6 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
        <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
      </form>
    </div>
  );
}