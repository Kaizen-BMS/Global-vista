"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import TimezoneSelect from "@/components/shared/TimezoneSelect";
import ImageUploadField from "@/components/shared/ImageUploadField";

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
        f.type === "image" ? (
          <ImageUploadField key={f.key} label={f.label} hint={f.hint} value={values[f.key] ?? ""} onChange={(v) => setValues((val) => ({ ...val, [f.key]: v }))} uploadUrl={f.uploadUrl} category={f.category} />
        ) : f.type === "toggle" ? (
          <div key={f.key} className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0">
              <p className="text-sm text-foreground">{f.label}</p>
              {f.hint && <p className="text-muted-foreground text-xs mt-0.5">{f.hint}</p>}
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={(values[f.key] ?? "true") !== "false"}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.checked ? "true" : "false" }))}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-indigo-600 transition-colors"></div>
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
            </label>
          </div>
        ) : (
          <div key={f.key}>
            <label className="block text-sm text-foreground mb-1">{f.label}</label>
            {f.type === "select" ? (
              <select value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition cursor-pointer">
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === "timezone-search" ? (
              <TimezoneSelect value={values[f.key] ?? ""} onChange={(z) => setValues((v) => ({ ...v, [f.key]: z }))} />
            ) : f.type === "textarea" ? (
              <textarea rows={f.rows || 3} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            ) : (
              <input type={f.type || "text"} value={values[f.key] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition" />
            )}
            {f.hint && <p className="text-muted-foreground text-xs mt-1">{f.hint}</p>}
          </div>
        )
      ))}
      <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
    </form>
  );
}