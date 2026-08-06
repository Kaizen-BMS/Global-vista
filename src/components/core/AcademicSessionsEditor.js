"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/components/crm/shared/apiClient";

const inputClass = "px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

export default function AcademicSessionsEditor({ sessions }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", isCurrent: false });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/settings/academic-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Academic session added.");
      setForm({ name: "", startDate: "", endDate: "", isCurrent: false });
      router.refresh();
    } catch (err) {
      toast.error(err.message || "Failed to add session.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/settings/academic-sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removed.");
      router.refresh();
    } catch {
      toast.error("Failed to remove session.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-2xl">
      <h2 className="text-white font-medium mb-4">Academic Sessions</h2>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-6">
        <input placeholder="Session name (e.g. 2026-27)" value={form.name} onChange={(e) => setField("name", e.target.value)} className={`${inputClass} sm:col-span-2`} required />
        <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={inputClass} required />
        <input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className={inputClass} required />
        <label className="flex items-center gap-2 text-sm text-neutral-300 sm:col-span-3">
          <input type="checkbox" checked={form.isCurrent} onChange={(e) => setField("isCurrent", e.target.checked)} />
          Set as current session
        </label>
        <button type="submit" disabled={saving} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </form>

      <div className="divide-y divide-neutral-800">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2">
            <div>
              <span className="text-neutral-300 text-sm">{s.name}</span>
              {!!s.is_current && <CheckCircle2 className="inline h-3.5 w-3.5 text-green-400 ml-2" />}
              <p className="text-neutral-500 text-xs">{s.start_date} → {s.end_date}</p>
            </div>
            <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="text-neutral-500 hover:text-red-400">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}