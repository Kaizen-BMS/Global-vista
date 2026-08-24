"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X, GripVertical, Loader2, Trash2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { AVAILABLE_FORM_FIELDS, defaultFormFields } from "@/lib/modules/crm/constants/leadFormFields";
import PublicLeadFormRenderer from "@/components/public/PublicLeadFormRenderer";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, hint, children }) {
  return (<div><label className="block text-sm text-foreground mb-1">{label}</label>{children}{hint && <p className="text-muted-foreground text-xs mt-1">{hint}</p>}</div>);
}

export default function LeadFormBuilder({ sources, services, users, initialData, formId, customFields = [] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [form, setForm] = useState(
    initialData || {
      name: "", description: "", fields: defaultFormFields(),
      defaultLeadSourceId: sources[0]?.id || "", defaultServiceId: services[0]?.id || "", defaultAssignedTo: "",
      defaultTags: "", campaign: "", successMessage: "Thanks! We'll be in touch shortly.", redirectUrl: "",
      notifyEmails: "", recaptchaEnabled: false, status: "active",
      theme: { primaryColor: "#4f46e5" },
    }
  );

  // Company custom fields (Settings > Lead Fields) join the same catalog the
  // standard fields come from — `custom:<field_key>` keeps them from ever
  // colliding with a standard field type. Their full shape (type, options)
  // is captured into fields_config at add-time so the public renderer never
  // needs a live lookup, and old submissions keep rendering correctly even
  // if the field definition changes later.
  const allAvailableFields = [
    ...AVAILABLE_FORM_FIELDS,
    ...customFields.map((f) => ({ type: `custom:${f.field_key}`, label: f.label, inputType: "custom", lockedRequired: false, fieldType: f.field_type, options: f.options, customFieldId: f.id })),
  ];

  function setField(key, value) { setForm((f) => ({ ...f, [key]: value })); }
  const usedTypes = new Set(form.fields.map((f) => f.type));
  const availableToAdd = allAvailableFields.filter((f) => !usedTypes.has(f.type));

  function addField(fieldType) {
    const def = allAvailableFields.find((f) => f.type === fieldType);
    setForm((f) => ({
      ...f,
      fields: [...f.fields, { type: def.type, label: def.label, placeholder: "", required: def.lockedRequired, ...(def.fieldType ? { fieldType: def.fieldType, options: def.options, customFieldId: def.customFieldId } : {}) }],
    }));
  }
  function removeField(index) {
    if (form.fields[index].type === "name" || form.fields[index].type === "phone") { toast.error("Name and Phone can't be removed — they're required to create a lead."); return; }
    setForm((f) => ({ ...f, fields: f.fields.filter((_, i) => i !== index) }));
  }
  function updateField(index, patch) {
    setForm((f) => ({ ...f, fields: f.fields.map((field, i) => (i === index ? { ...field, ...patch } : field)) }));
  }
  function reorderFields(from, to) {
    setForm((f) => {
      const next = [...f.fields];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...f, fields: next };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.defaultLeadSourceId || !form.defaultServiceId) { toast.error("A default Lead Source and Service are required."); return; }
    setSaving(true);
    try {
      const res = await apiFetch(formId ? `/api/leads/forms/${formId}` : "/api/leads/forms", {
        method: formId ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save form.");
      toast.success(formId ? "Form updated." : "Form created.");
      router.push(`/workspace/lead-forms/${formId || data.id}`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Details</p>
          <Field label="Form Name *"><input required className={inputClass} value={form.name} onChange={(e) => setField("name", e.target.value)} /></Field>
          <Field label="Description"><textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setField("description", e.target.value)} /></Field>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-foreground font-medium mb-1">Fields</p>
          <p className="text-muted-foreground text-xs mb-3">Drag to reorder. Name and Phone are always required to create a lead.</p>
          <div className="space-y-2">
            {form.fields.map((field, i) => (
              <div
                key={`${field.type}-${i}`}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragIndex !== null && dragIndex !== i) reorderFields(dragIndex, i); setDragIndex(null); }}
                className="flex items-center gap-3 bg-muted/50 border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                <input value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} className="flex-1 min-w-[100px] px-2 py-1.5 rounded bg-card border border-border text-foreground text-sm" />
                <input value={field.placeholder} onChange={(e) => updateField(i, { placeholder: e.target.value })} placeholder="Placeholder text" className="flex-1 min-w-[100px] px-2 py-1.5 rounded bg-card border border-border text-foreground text-sm" />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <input type="checkbox" checked={field.required} disabled={AVAILABLE_FORM_FIELDS.find((f) => f.type === field.type)?.lockedRequired} onChange={(e) => updateField(i, { required: e.target.checked })} /> Required
                </label>
                <button type="button" onClick={() => removeField(i)} aria-label="Remove field" className="text-muted-foreground hover:text-red-400 cursor-pointer shrink-0"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {availableToAdd.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {availableToAdd.map((f) => (
                <button key={f.type} type="button" onClick={() => addField(f.type)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground hover:text-foreground text-xs cursor-pointer transition">
                  <Plus className="h-3.5 w-3.5" /> {f.label}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Lead Routing</p>
          <p className="text-muted-foreground text-xs -mt-2">How every lead created by this form gets classified and (optionally) assigned. This is routing configuration for the form, not a preview lead.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Lead Source *" hint="Required — leads must have a source.">
              <select required className={inputClass} value={form.defaultLeadSourceId} onChange={(e) => setField("defaultLeadSourceId", e.target.value)}>
                <option value="">Select</option>{sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Service *" hint="Required — leads must have a service.">
              <select required className={inputClass} value={form.defaultServiceId} onChange={(e) => setField("defaultServiceId", e.target.value)}>
                <option value="">Select</option>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Assign Lead To">
              <select className={inputClass} value={form.defaultAssignedTo} onChange={(e) => setField("defaultAssignedTo", e.target.value)}>
                <option value="">Unassigned</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </Field>
            <Field label="Campaign"><input className={inputClass} value={form.campaign} onChange={(e) => setField("campaign", e.target.value)} /></Field>
            <Field label="Tags"><input className={inputClass} value={form.defaultTags} onChange={(e) => setField("defaultTags", e.target.value)} placeholder="e.g. website,fair-2026" /></Field>
            <Field label="Status">
              <select className={inputClass} value={form.status} onChange={(e) => setField("status", e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select>
            </Field>
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">After Submission</p>
          <Field label="Success Message"><input className={inputClass} value={form.successMessage} onChange={(e) => setField("successMessage", e.target.value)} /></Field>
          <Field label="Redirect URL" hint="Optional — leave blank to show the success message instead."><input className={inputClass} value={form.redirectUrl} onChange={(e) => setField("redirectUrl", e.target.value)} /></Field>
          <Field label="Notify Emails" hint="Comma-separated. Sent a branded email when someone submits."><input className={inputClass} value={form.notifyEmails} onChange={(e) => setField("notifyEmails", e.target.value)} placeholder="team@yourcompany.com" /></Field>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Spam Protection</p>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={form.recaptchaEnabled} onChange={(e) => setField("recaptchaEnabled", e.target.checked)} /> Require Google reCAPTCHA
          </label>
          <p className="text-muted-foreground text-xs">Rate limiting, a honeypot field, and duplicate detection are always on for every form.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-foreground font-medium">Theme</p>
          <div className="flex items-center gap-2">
            <input type="color" value={form.theme?.primaryColor || "#4f46e5"} onChange={(e) => setField("theme", { ...form.theme, primaryColor: e.target.value })} className="h-9 w-12 rounded bg-muted border border-border cursor-pointer" />
            <input value={form.theme?.primaryColor || ""} onChange={(e) => setField("theme", { ...form.theme, primaryColor: e.target.value })} className={inputClass} />
          </div>
        </section>

        <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {formId ? "Save Changes" : "Create Form"}
        </button>
      </div>

      <div className="lg:sticky lg:top-6 self-start">
        <p className="text-muted-foreground text-xs uppercase tracking-wider mb-2">Live Preview — exactly what visitors will see</p>
        <div className="rounded-2xl border border-border overflow-hidden">
          <PublicLeadFormRenderer
            preview
            form={{
              name: form.name || "Untitled Form",
              description: form.description,
              slug: "preview",
              fields_config: form.fields,
              theme_config: { primaryColor: form.theme?.primaryColor || "#4f46e5" },
              success_message: form.successMessage,
            }}
            branding={{ name: form.name || "Untitled Form" }}
          />
        </div>
      </div>
    </form>
  );
}
