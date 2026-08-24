"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, X, Plus, Trash2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

export const FIELD_TYPE_OPTIONS = [
  { value: "text", label: "Short Text" },
  { value: "textarea", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "datetime", label: "Date & Time" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio Buttons" },
  { value: "checkbox", label: "Checkbox (Yes/No)" },
  { value: "multiselect", label: "Multi-select" },
  { value: "country", label: "Country" },
  { value: "state", label: "State" },
  { value: "city", label: "City" },
  { value: "address", label: "Address" },
  { value: "url", label: "URL" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "file", label: "File Upload" },
];
const OPTION_TYPES = new Set(["select", "radio", "multiselect"]);

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) {
  return (<div><label className="block text-sm text-foreground mb-1">{label}</label>{children}{hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}</div>);
}
function Toggle({ label, checked, onChange, disabled }) {
  return (
    <label className={`flex items-center justify-between gap-3 py-1.5 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="text-sm text-foreground">{label}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(!checked)} className={`relative h-5 w-9 rounded-full transition-colors shrink-0 ${disabled ? "" : "cursor-pointer"} ${checked ? "bg-indigo-600" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}

export default function LeadCustomFieldForm({ initial, sections, defaultSection, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    section: initial?.section || defaultSection || "Custom Information",
    label: initial?.label || "",
    helpText: initial?.help_text || "",
    placeholder: initial?.placeholder || "",
    defaultValue: initial?.default_value || "",
    fieldType: initial?.field_type || "text",
    options: initial?.options?.length ? initial.options : ["", ""],
    showOnLeadForm: initial ? !!initial.show_on_lead_form : true,
    showOnLeadDetail: initial ? !!initial.show_on_lead_detail : true,
    showOnQueryForm: !!initial?.show_on_query_form,
    isRequiredOnLeadForm: !!initial?.is_required_on_lead_form,
    isRequiredOnQueryForm: !!initial?.is_required_on_query_form,
    status: initial?.status || "active",
  });
  const [newSectionName, setNewSectionName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }
  const needsOptions = OPTION_TYPES.has(form.fieldType);

  function updateOption(i, value) { setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? value : o)) })); }
  function addOption() { setForm((f) => ({ ...f, options: [...f.options, ""] })); }
  function removeOption(i) { setForm((f) => ({ ...f, options: f.options.filter((_, idx) => idx !== i) })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim()) { toast.error("Label is required."); return; }
    if (needsOptions && form.options.filter((o) => o.trim()).length === 0) { toast.error("Add at least one option."); return; }
    setSaving(true);
    try {
      const payload = { ...form, section: form.section === "__new__" ? newSectionName : form.section };
      if (!payload.section.trim()) { toast.error("Section name is required."); setSaving(false); return; }
      const res = await apiFetch(isEdit ? `/api/core/lead-custom-fields/${initial.id}` : "/api/core/lead-custom-fields", {
        method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      toast.success(isEdit ? "Field updated." : "Field created.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={isEdit ? "Edit Field" : "New Field"} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <p className="text-foreground font-semibold">{isEdit ? "Edit Field" : "New Field"}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <Field label="Section">
            <select className={inputClass} value={form.section === "__new__" ? "__new__" : form.section} onChange={(e) => setField("section", e.target.value)}>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
              <option value="__new__">+ New section…</option>
            </select>
            {form.section === "__new__" && (
              <input className={`${inputClass} mt-2`} placeholder="New section name" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} />
            )}
          </Field>

          <Field label="Label *"><input required autoFocus className={inputClass} value={form.label} onChange={(e) => setField("label", e.target.value)} placeholder="e.g. Visa Interview Date" /></Field>
          <Field label="Field Type *">
            <select className={inputClass} value={form.fieldType} onChange={(e) => setField("fieldType", e.target.value)}>
              {FIELD_TYPE_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>

          {needsOptions && (
            <Field label="Options *">
              <div className="space-y-2">
                {form.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input className={inputClass} value={opt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Option ${i + 1}`} />
                    <button type="button" onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`} className="text-muted-foreground hover:text-red-400 cursor-pointer shrink-0"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={addOption} className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"><Plus className="h-3.5 w-3.5" /> Add option</button>
              </div>
            </Field>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Placeholder"><input className={inputClass} value={form.placeholder} onChange={(e) => setField("placeholder", e.target.value)} /></Field>
            <Field label="Default Value"><input className={inputClass} value={form.defaultValue} onChange={(e) => setField("defaultValue", e.target.value)} /></Field>
          </div>
          <Field label="Help Text" hint="Shown under the field as a description."><input className={inputClass} value={form.helpText} onChange={(e) => setField("helpText", e.target.value)} /></Field>

          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Add Lead / Edit Lead</p>
            <Toggle label="Show on Add/Edit Lead" checked={form.showOnLeadForm} onChange={(v) => setField("showOnLeadForm", v)} />
            <Toggle label="Required on Add/Edit Lead" checked={form.isRequiredOnLeadForm} disabled={!form.showOnLeadForm} onChange={(v) => setField("isRequiredOnLeadForm", v)} />
          </div>
          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Query Form</p>
            <Toggle label="Show on Query Form" checked={form.showOnQueryForm} onChange={(v) => setField("showOnQueryForm", v)} />
            <Toggle label="Required on Query Form" checked={form.isRequiredOnQueryForm} disabled={!form.showOnQueryForm} onChange={(v) => setField("isRequiredOnQueryForm", v)} />
          </div>
          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lead Detail</p>
            <Toggle label="Show on Lead Detail" checked={form.showOnLeadDetail} onChange={(v) => setField("showOnLeadDetail", v)} />
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
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {isEdit ? "Save Changes" : "Create Field"}
          </button>
        </div>
      </form>
      </ModalFocusTrap>
    </div>
  );
}
