"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function PlatformSettingsForm({ group, fields, initialValues }) {
  const [values, setValues] = useState(initialValues || {});
  const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/platform/settings/${group}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
      if (!res.ok) throw new Error();
      toast.success("Saved.");
    } catch { toast.error("Failed to save."); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-xl space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm text-neutral-300 mb-1">{f.label}</label>
          {f.type === "select" ? (
            <select value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm">
              {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input type={f.type || "text"} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
          )}
        </div>
      ))}
      <button type="submit" disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
    </form>
  );
}
