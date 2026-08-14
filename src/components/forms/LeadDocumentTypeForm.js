"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, children }) {
  return (<div><label className="block text-sm text-foreground mb-1">{label}</label>{children}</div>);
}
function Toggle({ label, checked, onChange }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer">
      <span className="text-sm text-foreground">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition-colors cursor-pointer shrink-0 ${checked ? "bg-indigo-600" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function LeadDocumentTypeForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || "",
    description: initial?.description || "",
    isRequired: !!initial?.is_required,
    status: initial?.status || "active",
  });
  const [saving, setSaving] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(isEdit ? `/api/core/lead-document-types/${initial.id}` : "/api/core/lead-document-types", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      toast.success(isEdit ? "Document type updated." : "Document type created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-foreground font-semibold">{isEdit ? "Edit Document Type" : "New Document Type"}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Name *"><input required autoFocus className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Passport" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Shown to whoever is uploading" /></Field>
          <div className="border-t border-border pt-4">
            <Toggle label="Required" checked={form.isRequired} onChange={(v) => setField("isRequired", v)} />
          </div>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isEdit ? "Save Changes" : "Create Type"}
          </button>
        </div>
      </form>
    </div>
  );
}
