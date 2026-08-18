"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, X, Lock } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) { return (<div><label className="block text-sm text-foreground mb-1">{label}</label>{children}{hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}</div>); }
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

/** Built-in fields never get a field-type/options editor — only the safe
 * presentation/configuration properties (label, help text, placeholder,
 * section, per-surface visibility/required) can change. The underlying
 * `leads` column type is fixed in code, never here. */
export default function BuiltinFieldEditorModal({ field, sections, onClose, onSaved }) {
  const [form, setForm] = useState({
    label: field.label, helpText: field.helpText || "", placeholder: field.placeholder || "",
    sectionId: field.sectionId || "",
    showOnLeadForm: field.showOnLeadForm, showOnLeadDetail: field.showOnLeadDetail, showOnQueryForm: field.showOnQueryForm,
    isRequiredOnLeadForm: field.isRequiredOnLeadForm, isRequiredOnQueryForm: field.isRequiredOnQueryForm,
  });
  const [saving, setSaving] = useState(false);
  const locked = field.coreRequired;

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.label.trim()) { toast.error("Label is required."); return; }
    setSaving(true);
    try {
      const res = await apiFetch("/api/core/lead-field-layout", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldKey: field.key, ...form, sectionId: form.sectionId || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to save.");
      toast.success("Field updated.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <p className="text-foreground font-semibold">Edit "{field.label}"</p>
            <p className="text-muted-foreground text-xs mt-0.5">Built-in field · database column <code className="text-[11px]">{field.column}</code></p>
          </div>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          {locked && (
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-300 text-xs">
              <Lock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              This field is required by the database and can't be hidden or made optional on Add Lead — you can still relabel it and move it to another section.
            </div>
          )}

          <Field label="Display Label *"><input required autoFocus className={inputClass} value={form.label} onChange={(e) => setField("label", e.target.value)} /></Field>
          <Field label="Section">
            <select className={inputClass} value={form.sectionId} onChange={(e) => setField("sectionId", e.target.value)}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Placeholder"><input className={inputClass} value={form.placeholder} onChange={(e) => setField("placeholder", e.target.value)} /></Field>
            <Field label="Help Text"><input className={inputClass} value={form.helpText} onChange={(e) => setField("helpText", e.target.value)} /></Field>
          </div>

          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Add Lead / Edit Lead</p>
            <Toggle label="Show on Add/Edit Lead" checked={form.showOnLeadForm} disabled={locked} onChange={(v) => setField("showOnLeadForm", v)} />
            <Toggle label="Required on Add/Edit Lead" checked={form.isRequiredOnLeadForm} disabled={locked || !form.showOnLeadForm} onChange={(v) => setField("isRequiredOnLeadForm", v)} />
          </div>
          <div className="border-t border-border pt-4 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Lead Detail</p>
            <Toggle label="Show on Lead Detail" checked={form.showOnLeadDetail} onChange={(v) => setField("showOnLeadDetail", v)} />
            <p className="text-muted-foreground text-xs pt-1">Query Forms already choose their own fields independently — see Query Forms in the sidebar to add this field to a specific form.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border sticky bottom-0 bg-card">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
