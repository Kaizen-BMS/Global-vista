"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function AcademicSessionsEditor({ sessions }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", isCurrent: false });
  const [saving, setSaving] = useState(false);
  async function handleAdd(e) {
    e.preventDefault(); setSaving(true);
    try { const res = await apiFetch("/api/core/organization/academic-sessions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); toast.success("Added."); setForm({ name: "", startDate: "", endDate: "", isCurrent: false }); router.refresh(); }
    catch (e) { toast.error(e.message || "Failed."); } finally { setSaving(false); }
  }
  async function handleDelete(id) { try { const res = await apiFetch(`/api/core/organization/academic-sessions/${id}`, { method: "DELETE" }); if (!res.ok) throw new Error(); router.refresh(); } catch { toast.error("Failed."); } }
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
      <h2 className="text-white font-medium mb-4">Academic Sessions</h2>
      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
        <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="sm:col-span-2 px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" required />
        <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" required />
        <input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" required />
        <label className="flex items-center gap-2 text-sm text-neutral-300 sm:col-span-3 cursor-pointer"><input type="checkbox" checked={form.isCurrent} onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })} className="cursor-pointer" />Current session</label>
        <button type="submit" disabled={saving} className="btn-brand flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-white text-sm disabled:opacity-60 cursor-pointer">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}</button>
      </form>
      <div className="divide-y divide-neutral-800">{sessions.map((s) => <div key={s.id} className="flex items-center justify-between py-2"><div><span className="text-neutral-300 text-sm">{s.name}</span>{!!s.is_current && <CheckCircle2 className="inline h-3.5 w-3.5 text-green-400 ml-2" />}</div><button onClick={() => handleDelete(s.id)} className="cursor-pointer"><Trash2 className="h-4 w-4 text-neutral-500 hover:text-red-400 transition-colors" /></button></div>)}</div>
    </div>
  );
}