"use client";
import { toast } from "sonner";
import { Download, ListTree } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import EmptyState from "@/components/shared/EmptyState";

function formatValue(field) {
  if (field.inputType === "checkbox") return field.value === "Yes" ? "Yes" : "No";
  if (field.inputType === "multiselect") {
    try { return JSON.parse(field.value).join(", "); } catch { return field.value; }
  }
  return field.value;
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

/**
 * Groups every field with a value — built-in and custom together — by the
 * company's configured sections (getLeadDetailFieldGroups). Custom fields
 * whose definition was later disabled/deleted still render here (marked
 * "No longer configured") since the value itself must never disappear just
 * because the field configuration changed.
 */
export default function LeadFieldsDisplay({ leadId, groups }) {
  if (!groups || groups.length === 0) {
    return <EmptyState icon={ListTree} title="No field data yet" description="Details filled in on Add/Edit Lead will show up here, grouped by section." />;
  }

  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.section.name} className="bg-card border border-border rounded-xl p-5">
          <p className="text-foreground font-medium mb-3">{g.section.name}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {g.fields.map((field) => (
              <div key={field.key}>
                <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5">
                  {field.label}
                  {field.noLongerConfigured && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border">No longer configured</span>
                  )}
                </p>
                {field.isCustom && field.inputType === "file" ? (
                  <FileValue leadId={leadId} fieldId={field.id} value={field.value} />
                ) : (
                  <p className="text-foreground text-sm break-words">{formatValue(field) || "—"}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
