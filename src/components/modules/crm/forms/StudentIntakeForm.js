"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { BUILTIN_LEAD_FIELDS } from "@/lib/modules/crm/constants/builtinLeadFields";
import CustomFieldInput from "@/components/crm/leads/CustomFieldInput";
import BuiltinFieldInput from "@/components/crm/leads/BuiltinFieldInput";
import { apiFetch } from "@/components/shared/apiClient";

/**
 * The simplified, school-facing counterpart to LeadForm.js — matches the
 * user's Student Profile spec exactly: Student ID (auto, read-only),
 * core student/parent details, DOB, academics (Class/Stream/Subjects via
 * the Student Information custom fields seeded in provisioning.js),
 * Country/State as real dropdowns (prefilled India/Punjab, not the free-
 * text GeoAutocomplete the rest of the CRM uses), District/School/
 * Academic Year (custom fields), Lead Source/Service prefilled by name
 * ("Project UDAAN"/"Career Counselling") but still changeable, and Assign
 * To. Campaign/Tags/"After Submission"/Spam Protection are simply never
 * rendered here — there's nothing to "hide", they were never part of this
 * form's field set.
 */
const BUILTIN_SECTIONS = [
  { name: "Student Details", keys: ["name", "phone", "dob"] },
  { name: "Location", keys: ["country", "state"] },
  { name: "Source & Assignment", keys: ["leadSourceId", "serviceId", "assignedTo"] },
];

const BUILTIN_DEFAULTS = { name: "", phone: "", dob: "", country: "India", state: "Punjab", leadSourceId: "", serviceId: "", assignedTo: "" };

function fieldDef(key) {
  const f = BUILTIN_LEAD_FIELDS.find((f) => f.key === key);
  if (!f) return null;
  // Overrides this form's rendering only — BUILTIN_LEAD_FIELDS itself (and
  // every other form/admin screen reading it) is untouched.
  if (key === "state") return { ...f, inputType: "state-select", label: "State" };
  return f;
}

function defaultIdByName(list, name) {
  const match = list.find((x) => x.name.toLowerCase() === name.toLowerCase());
  return match ? String(match.id) : "";
}

export default function StudentIntakeForm({ sources = [], services = [], customFields = [], counsellors = [] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ...BUILTIN_DEFAULTS,
    leadSourceId: defaultIdByName(sources, "Project UDAAN"),
    serviceId: defaultIdByName(services, "Career Counselling"),
  });
  const [customValues, setCustomValues] = useState({});

  function setField(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setCustomField(fieldId, value) {
    setCustomValues((v) => ({ ...v, [fieldId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await apiFetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add student.");
        setSaving(false);
        return;
      }

      if (customFields.length > 0) {
        try {
          const cfRes = await apiFetch(`/api/leads/${data.id}/custom-field-values`, {
            method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ values: customValues }),
          });
          if (!cfRes.ok) { const cfData = await cfRes.json().catch(() => ({})); toast.error(cfData.error || "Student added, but custom fields failed to save."); }
        } catch { toast.error("Student added, but custom fields failed to save."); }
      }

      toast.success("Student added.");
      router.push(`/workspace/lead-management/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <label className="block text-sm text-foreground mb-1">Student ID</label>
        <input disabled value="Auto-generated on save" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-muted-foreground text-sm" />
      </div>

      {BUILTIN_SECTIONS.map((section) => (
        <div key={section.name} className="bg-card border border-border rounded-xl p-6 space-y-4">
          <p className="text-foreground font-medium">{section.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {section.keys.map((key) => {
              const field = fieldDef(key);
              if (!field) return null;
              const required = !!field.coreRequired || ["dob", "country", "state"].includes(key);
              return (
                <div key={key}>
                  <label className="block text-sm text-foreground mb-1">{field.label}{required ? " *" : ""}</label>
                  <BuiltinFieldInput field={field} value={form[key]} onChange={(v) => setField(key, v)} required={required} sources={sources} services={services} counsellors={counsellors} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {customFields.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <p className="text-foreground font-medium">Student Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customFields.map((field) => (
              <div key={field.id} className={field.field_type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="block text-sm text-foreground mb-1">{field.label}{field.is_required_on_lead_form ? " *" : ""}</label>
                <CustomFieldInput field={field} value={customValues[field.id] ?? field.default_value ?? ""} onChange={(v) => setCustomField(field.id, v)} />
                {field.help_text && <p className="text-muted-foreground text-xs mt-1">{field.help_text}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Add Student"}
        </button>
      </div>
    </form>
  );
}
