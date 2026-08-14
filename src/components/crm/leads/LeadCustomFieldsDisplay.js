"use client";
import { toast } from "sonner";
import { Download, ListTree } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import EmptyState from "@/components/shared/EmptyState";

function formatValue(row) {
  if (row.field_type === "checkbox") return row.value === "Yes" ? "Yes" : "No";
  if (row.field_type === "multiselect") {
    try { return JSON.parse(row.value).join(", "); } catch { return row.value; }
  }
  return row.value;
}

function FileValue({ leadId, fieldId, value }) {
  let fileName = "File";
  try { fileName = JSON.parse(value)?.fileName || "File"; } catch { /* not a file-shaped value */ }

  async function download() {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/custom-field-values/${fieldId}/download`);
      const data = await res.json();
      if (!res.ok) throw new Error();
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch { toast.error("Failed to open file."); }
  }

  return (
    <button onClick={download} className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-sm cursor-pointer">
      <Download className="h-3.5 w-3.5" /> {fileName}
    </button>
  );
}

/** Groups by section; deliberately includes values for fields that have since been disabled/deleted, so historical answers never disappear. */
export default function LeadCustomFieldsDisplay({ leadId, values }) {
  if (!values || values.length === 0) {
    return <EmptyState icon={ListTree} title="No custom field data" description="No custom fields have been filled in for this lead yet." />;
  }

  const order = [];
  const bySection = new Map();
  for (const v of values) {
    if (!bySection.has(v.section)) { bySection.set(v.section, []); order.push(v.section); }
    bySection.get(v.section).push(v);
  }

  return (
    <div className="space-y-5">
      {order.map((section) => (
        <div key={section} className="bg-card border border-border rounded-xl p-5">
          <p className="text-foreground font-medium mb-3">{section}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bySection.get(section).map((row) => (
              <div key={row.field_id}>
                <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5">
                  {row.label}
                  {(row.field_deleted || row.field_status === "inactive") && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border">No longer configured</span>
                  )}
                </p>
                {row.field_type === "file" ? (
                  <FileValue leadId={leadId} fieldId={row.field_id} value={row.value} />
                ) : (
                  <p className="text-foreground text-sm break-words">{formatValue(row) || "—"}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
