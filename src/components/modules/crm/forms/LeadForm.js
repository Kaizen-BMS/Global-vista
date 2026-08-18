"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import CustomFieldInput from "@/components/crm/leads/CustomFieldInput";
import BuiltinFieldInput from "@/components/crm/leads/BuiltinFieldInput";
import { apiFetch } from "@/components/shared/apiClient";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

const BUILTIN_DEFAULTS = {
  name: "", email: "", phone: "", whatsapp: "",
  country: "", state: "", city: "", address: "", gender: "", dob: "",
  school: "", college: "", currentQualification: "", passingYear: "", percentage: "",
  englishTest: "", ieltsScore: "", pteScore: "",
  preferredCountry: "", preferredUniversity: "", preferredIntake: "", budget: "", passportStatus: "",
  leadSourceId: "", campaign: "", serviceId: "", assignedTo: "", assignedTeam: "", priority: "Medium", tags: "",
  remarks: "", notes: "",
};

/**
 * The Add/Edit Lead form is now entirely driven by `groups` — the merged,
 * company-configured section/field layout from getFullLeadFormLayout
 * (context: "lead_form"). Nothing about which fields exist, what they're
 * called, what order they render in, or which section they sit in is
 * hardcoded here anymore; that's the whole point of the Lead Form Builder.
 * The submitted payload keys are unchanged (still the exact camelCase keys
 * createLead/updateLead expect) — only presentation is configurable.
 */
export default function LeadForm({
  sources = [], services = [], counsellors = [], tagSuggestions = [], initialData = null,
  customFields = [], initialCustomValues = {}, groups = [],
}) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState(0);
  const [saving, setSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [form, setForm] = useState({ ...BUILTIN_DEFAULTS, ...(initialData || {}) });
  const [customValues, setCustomValues] = useState(initialCustomValues);

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "phone") checkDuplicate(value);
  }
  function setCustomField(fieldId, value) {
    setCustomValues((v) => ({ ...v, [fieldId]: value }));
  }

  async function checkDuplicate(phone) {
    if (!phone || phone.length < 7) { setDuplicateWarning(null); return; }
    try {
      const res = await fetch(`/api/leads?search=${encodeURIComponent(phone)}&pageSize=1`);
      const data = await res.json();
      if (data.leads?.length > 0 && data.leads[0].id !== initialData?.id) {
        setDuplicateWarning(data.leads[0]);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // non-blocking
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const isEdit = !!initialData?.id;
      const res = await apiFetch(isEdit ? `/api/leads/${initialData.id}` : "/api/leads", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save lead.");
        setSaving(false);
        return;
      }

      const targetId = isEdit ? initialData.id : data.id;

      // Custom field values save as a second call against the lead that
      // now definitely exists — keeps leads.js untouched by a schema this
      // deployment may not have yet (see schemaFlags.js); a failure here
      // is surfaced but never blocks the lead itself from being saved.
      if (customFields.length > 0) {
        try {
          const cfRes = await apiFetch(`/api/leads/${targetId}/custom-field-values`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: customValues }),
          });
          if (!cfRes.ok) { const cfData = await cfRes.json().catch(() => ({})); toast.error(cfData.error || "Lead saved, but custom fields failed to save."); }
        } catch { toast.error("Lead saved, but custom fields failed to save."); }
      }

      toast.success(isEdit ? "Lead updated." : "Lead created.");

      // Explicit navigation + refresh so the toast is followed by a real
      // redirect into the lead's details page and a fresh server render
      // (fixes "toast appears but user stays on same page").
      router.push(`/workspace/lead-management/${targetId}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
      setSaving(false);
    }
  }

  const activeGroup = groups[activeSection];

  return (
    <form onSubmit={handleSubmit}>
      {duplicateWarning && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-4 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-300 text-sm"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Possible duplicate: {duplicateWarning.name} ({duplicateWarning.phone}) already exists.
        </motion.div>
      )}

      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {groups.map((g, i) => (
          <button
            type="button"
            key={g.section.name}
            onClick={() => setActiveSection(i)}
            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition ${
              activeSection === i ? "bg-indigo-600 text-white" : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {g.section.name}
          </button>
        ))}
      </div>

      {activeGroup && (
        <motion.div
          key={activeSection}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeGroup.fields.map((field) => {
              const wide = field.inputType === "textarea";
              if (field.isCustom) {
                return (
                  <div key={field.key} className={wide ? "sm:col-span-2" : ""}>
                    <Field label={`${field.label}${field.isRequiredOnLeadForm ? " *" : ""}`}>
                      <CustomFieldInput field={{ ...field, id: field.id, field_type: field.inputType, is_required_on_lead_form: field.isRequiredOnLeadForm }} value={customValues[field.id]} onChange={(v) => setCustomField(field.id, v)} leadId={initialData?.id} />
                    </Field>
                    {field.helpText && <p className="text-muted-foreground text-xs mt-1">{field.helpText}</p>}
                  </div>
                );
              }
              return (
                <div key={field.key} className={wide ? "sm:col-span-2" : ""}>
                  <Field label={`${field.label}${field.isRequiredOnLeadForm ? " *" : ""}`}>
                    <BuiltinFieldInput
                      field={field} value={form[field.key]} onChange={(v) => setField(field.key, v)} required={field.isRequiredOnLeadForm}
                      sources={sources} services={services} counsellors={counsellors} tagSuggestions={tagSuggestions}
                    />
                  </Field>
                  {field.helpText && <p className="text-muted-foreground text-xs mt-1">{field.helpText}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          type="button"
          disabled={activeSection === 0}
          onClick={() => setActiveSection((s) => Math.max(0, s - 1))}
          className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm disabled:opacity-40"
        >
          Back
        </button>

        {activeSection < groups.length - 1 ? (
          <button
            type="button"
            onClick={() => setActiveSection((s) => Math.min(groups.length - 1, s + 1))}
            className="btn-brand px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"
          >
            Next
          </button>
        ) : (
          <button
            type="submit"
            disabled={saving}
            className="btn-brand flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : initialData?.id ? "Update Lead" : "Create Lead"}
          </button>
        )}
      </div>
    </form>
  );
}
