"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

export default function SettingsForm({ group, fields, initialValues }) {
  const [values, setValues] = useState(initialValues || {}); const [saving, setSaving] = useState(false);
  async function handleSubmit(e) {
    e.preventDefault(); setSaving(true);
    try { const res = await apiFetch(`/api/core/settings/${group}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) }); if (!res.ok) throw new Error(); toast.success("Saved."); }
    catch { toast.error("Failed."); } finally { setSaving(false); }
  }
  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 max-w-xl space-y-4">
      {fields.map((f) => (
        <div key={f.key}>
          <label className="block text-sm text-foreground mb-1">{f.label}</label>
          {f.type === "select" ? (
            <select value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer">
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          ) : (
            <input type={f.type || "text"} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
          )}
          {f.hint && <p className="text-muted-foreground text-xs mt-1">{f.hint}</p>}
        </div>
      ))}
      <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
    </form>
  );
}