"use client";
import { LEAD_PRIORITIES } from "@/lib/modules/crm/constants/leadStages";
import { INDIAN_STATES_AND_UTS } from "@/lib/modules/crm/constants/indianStates";
import TagInput from "@/components/shared/TagInput";
import GeoAutocomplete from "@/components/shared/GeoAutocomplete";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

/** One built-in (physical `leads` column) field's input control, dispatched
 * by the registry's inputType — the company-facing counterpart to
 * CustomFieldInput.js. Never changes what gets submitted (still the exact
 * camelCase key createLead/updateLead expect), only which control renders
 * and where, per company configuration. */
export default function BuiltinFieldInput({ field, value, onChange, required, sources = [], services = [], counsellors = [], tagSuggestions = [] }) {
  switch (field.inputType) {
    case "textarea":
      return <textarea rows={3} required={required} placeholder={field.placeholder || ""} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    case "geo-country":
      return <GeoAutocomplete type="country" value={value || ""} onChange={onChange} placeholder={field.placeholder || "e.g. India"} />;
    case "geo-state":
      return <GeoAutocomplete type="state" value={value || ""} onChange={onChange} placeholder={field.placeholder || "e.g. Punjab"} />;
    case "geo-city":
      return <GeoAutocomplete type="city" value={value || ""} onChange={onChange} placeholder={field.placeholder || "e.g. Sirsa"} />;
    // A genuine fixed dropdown of all 28 states + 8 UTs — distinct from
    // geo-state's free-text autocomplete, used only by the school-facing
    // StudentIntakeForm where the user asked for a real Select, not a
    // type-ahead against the shared states/cities reference tables.
    case "state-select":
      return (
        <select required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          {INDIAN_STATES_AND_UTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    case "select": {
      const labelFor = { male: "Male", female: "Female", other: "Other" };
      return (
        <select required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">{field.placeholder || "Select"}</option>
          {(field.options || []).map((o) => <option key={o} value={o}>{labelFor[o] || o}</option>)}
        </select>
      );
    }
    case "lead-source":
      return (
        <select required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select source</option>
          {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      );
    case "service":
      return (
        <select required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Select service</option>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      );
    case "employee":
      return (
        <select className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">Unassigned</option>
          {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      );
    case "priority":
      return (
        <select className={inputClass} value={value || "Medium"} onChange={(e) => onChange(e.target.value)}>
          {LEAD_PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      );
    case "tags":
      return <TagInput value={value || ""} onChange={onChange} suggestions={tagSuggestions} />;
    default: {
      const type = { number: "number", date: "date", datetime: "datetime-local", url: "url", email: "email", tel: "tel" }[field.inputType] || "text";
      return <input type={type} required={required} placeholder={field.placeholder || ""} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }
  }
}
