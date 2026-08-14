"use client";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Paperclip, Download } from "lucide-react";
import GeoAutocomplete from "@/components/shared/GeoAutocomplete";
import { apiFetch } from "@/components/shared/apiClient";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

/** One custom field's input control, dispatched by field_type. Used on Add Lead / Edit Lead. */
export default function CustomFieldInput({ field, value, onChange, leadId }) {
  if (field.field_type === "file") return <FileFieldInput field={field} leadId={leadId} value={value} />;

  const required = !!field.is_required_on_lead_form;

  if (field.field_type === "textarea") {
    return <textarea rows={3} required={required} placeholder={field.placeholder || ""} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
  }
  if (["country", "state", "city"].includes(field.field_type)) {
    return <GeoAutocomplete type={field.field_type} value={value || ""} onChange={onChange} placeholder={field.placeholder} />;
  }
  if (field.field_type === "select") {
    return (
      <select required={required} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">{field.placeholder || "Select"}</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.field_type === "radio") {
    return (
      <div className="flex flex-wrap gap-3">
        {field.options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <input type="radio" name={`custom-${field.id}`} checked={value === o} onChange={() => onChange(o)} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.field_type === "multiselect") {
    let selected = [];
    try { selected = value ? JSON.parse(value) : []; } catch { selected = []; }
    function toggle(o) {
      const next = selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o];
      onChange(JSON.stringify(next));
    }
    return (
      <div className="flex flex-wrap gap-3">
        {field.options.map((o) => (
          <label key={o} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} /> {o}
          </label>
        ))}
      </div>
    );
  }
  if (field.field_type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
        <input type="checkbox" checked={value === "Yes"} onChange={(e) => onChange(e.target.checked ? "Yes" : "No")} /> Yes
      </label>
    );
  }

  const inputType = { number: "number", date: "date", datetime: "datetime-local", url: "url", email: "email", phone: "tel" }[field.field_type] || "text";
  return <input type={inputType} required={required} placeholder={field.placeholder || ""} className={inputClass} value={value || ""} onChange={(e) => onChange(e.target.value)} />;
}

function FileFieldInput({ field, leadId, value }) {
  const [uploading, setUploading] = useState(false);
  const [current, setCurrent] = useState(() => { try { return value ? JSON.parse(value) : null; } catch { return null; } });
  const inputRef = useRef(null);

  if (!leadId) {
    return <p className="text-muted-foreground text-xs">Save the lead first, then upload this file from the Edit Lead page.</p>;
  }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await apiFetch(`/api/leads/${leadId}/custom-field-values/${field.id}/upload`, { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      setCurrent({ fileName: data.fileName, size: data.size });
      toast.success("File uploaded.");
    } catch (err) { toast.error(err.message); } finally { setUploading(false); }
  }

  async function download() {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/custom-field-values/${field.id}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Failed to open file."); }
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />} {current ? "Replace" : "Upload"}
      </button>
      {current && (
        <button type="button" onClick={download} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
          <Download className="h-3.5 w-3.5" /> <span className="truncate max-w-[160px]">{current.fileName}</span>
        </button>
      )}
    </div>
  );
}
