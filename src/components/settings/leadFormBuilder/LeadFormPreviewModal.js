"use client";
import { X, Eye } from "lucide-react";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm";

function PreviewInput({ field }) {
  if (field.inputType === "textarea") return <textarea rows={2} disabled placeholder={field.placeholder || ""} className={inputClass} />;
  if (["select", "lead-source", "service", "employee", "priority"].includes(field.inputType)) {
    return (
      <select disabled className={inputClass}>
        <option>{field.placeholder || "Select…"}</option>
        {(field.options || []).map((o) => <option key={o}>{o}</option>)}
      </select>
    );
  }
  if (field.inputType === "radio" || field.inputType === "multiselect") {
    return (
      <div className="flex flex-wrap gap-3">
        {(field.options || []).map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <input type={field.inputType === "radio" ? "radio" : "checkbox"} disabled /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.inputType === "checkbox") return <label className="flex items-center gap-2 text-sm text-muted-foreground"><input type="checkbox" disabled /> Yes</label>;
  const type = { date: "date", datetime: "datetime-local", number: "number", email: "email", phone: "tel", tel: "tel", url: "url" }[field.inputType] || "text";
  return <input disabled type={type} placeholder={field.placeholder || ""} className={inputClass} />;
}

/** Read-only mockup of exactly what Add Lead will render for this company —
 * same section/field data the builder already loaded, filtered down to the
 * "lead_form" surface client-side (no live inputs, nothing submits). */
export default function LeadFormPreviewModal({ groups, onClose }) {
  const visibleGroups = groups
    .filter((g) => g.section.status === "active")
    .map((g) => ({ ...g, fields: g.fields.filter((f) => f.showOnLeadForm && (!f.isCustom || f.status === "active")) }))
    .filter((g) => g.fields.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background border border-border rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background z-10">
          <p className="text-foreground font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-indigo-400" /> Add Lead — Preview</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-6">
          {visibleGroups.length === 0 && <p className="text-muted-foreground text-sm text-center py-10">No fields are currently visible on Add Lead.</p>}
          {visibleGroups.map((g) => (
            <div key={g.section.name}>
              <p className="text-foreground font-medium mb-3">{g.section.name}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {g.fields.map((f) => (
                  <div key={f.key} className={f.inputType === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="block text-sm text-foreground mb-1">{f.label}{f.isRequiredOnLeadForm && <span className="text-red-400"> *</span>}</label>
                    <PreviewInput field={f} />
                    {f.helpText && <p className="text-muted-foreground text-xs mt-1">{f.helpText}</p>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
