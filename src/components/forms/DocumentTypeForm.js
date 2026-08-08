"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const FILE_TYPE_OPTIONS = ["pdf", "doc", "docx", "xls", "xlsx", "zip", "jpg", "jpeg", "png", "webp", "svg"];

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) {
  return (<div><label className="block text-sm text-foreground mb-1">{label}</label>{children}{hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}</div>);
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

export default function DocumentTypeForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(() => ({
    name: initial?.name || "",
    description: initial?.description || "",
    isRequired: !!initial?.is_required,
    allowedFileTypes: initial?.allowed_file_types ? initial.allowed_file_types.split(",").map((t) => t.trim()) : ["pdf", "jpg", "jpeg", "png"],
    maxFileSizeMb: initial?.max_file_size_mb ?? 10,
    expiryRequired: !!initial?.expiry_required,
    expiryReminderDays: initial?.expiry_reminder_days ?? 30,
    multipleFilesAllowed: !!initial?.multiple_files_allowed,
    employeeVisible: initial ? !!initial.employee_visible : true,
    hrVisible: initial ? !!initial.hr_visible : true,
    managerVisible: !!initial?.manager_visible,
    displayOrder: initial?.display_order ?? 0,
    status: initial?.status || "active",
  }));
  const [saving, setSaving] = useState(false);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }
  function toggleFileType(ext) {
    setForm((f) => ({ ...f, allowedFileTypes: f.allowedFileTypes.includes(ext) ? f.allowedFileTypes.filter((t) => t !== ext) : [...f.allowedFileTypes, ext] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.allowedFileTypes.length === 0) { toast.error("Select at least one allowed file type."); return; }
    setSaving(true);
    try {
      const payload = { ...form, allowedFileTypes: form.allowedFileTypes.join(",") };
      const res = await apiFetch(isEdit ? `/api/core/organization/document-types/${initial.id}` : "/api/core/organization/document-types", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      toast.success(isEdit ? "Document type updated." : "Document type created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-foreground font-semibold">{isEdit ? "Edit Document Type" : "New Document Type"}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Name *"><input required className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Passport" /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>

          <Field label="Allowed File Types *">
            <div className="flex flex-wrap gap-2">
              {FILE_TYPE_OPTIONS.map((ext) => (
                <button
                  key={ext} type="button" onClick={() => toggleFileType(ext)}
                  className={`px-2.5 py-1 rounded-md text-xs border cursor-pointer transition uppercase ${form.allowedFileTypes.includes(ext) ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-muted border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {ext}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Max File Size (MB)"><input type="number" min={1} max={100} className={inputClass} value={form.maxFileSizeMb} onChange={(e) => setField("maxFileSizeMb", Number(e.target.value))} /></Field>
            <Field label="Display Order"><input type="number" min={0} className={inputClass} value={form.displayOrder} onChange={(e) => setField("displayOrder", Number(e.target.value))} /></Field>
          </div>

          <div className="border-t border-border pt-4 space-y-1">
            <Toggle label="Required" checked={form.isRequired} onChange={(v) => setField("isRequired", v)} />
            <Toggle label="Multiple Files Allowed" checked={form.multipleFilesAllowed} onChange={(v) => setField("multipleFilesAllowed", v)} />
            <Toggle label="Expiry Required" checked={form.expiryRequired} onChange={(v) => setField("expiryRequired", v)} />
          </div>

          {form.expiryRequired && (
            <Field label="Expiry Reminder (days before)"><input type="number" min={0} className={inputClass} value={form.expiryReminderDays} onChange={(e) => setField("expiryReminderDays", Number(e.target.value))} /></Field>
          )}

          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Visibility</p>
            <Toggle label="Employee Visible" checked={form.employeeVisible} onChange={(v) => setField("employeeVisible", v)} />
            <Toggle label="HR Visible" checked={form.hrVisible} onChange={(v) => setField("hrVisible", v)} />
            <Toggle label="Manager Visible" checked={form.managerVisible} onChange={(v) => setField("managerVisible", v)} />
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
