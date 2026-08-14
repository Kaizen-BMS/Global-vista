"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, ListTree, AlertTriangle, ChevronUp, ChevronDown, Check, X as XIcon } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import LeadCustomFieldForm, { FIELD_TYPE_OPTIONS } from "@/components/forms/LeadCustomFieldForm";
import EmptyState from "@/components/shared/EmptyState";

const TYPE_LABEL = Object.fromEntries(FIELD_TYPE_OPTIONS.map((t) => [t.value, t.label]));

function groupBySection(fields) {
  const order = [];
  const map = new Map();
  for (const f of fields) {
    if (!map.has(f.section)) { map.set(f.section, []); order.push(f.section); }
    map.get(f.section).push(f);
  }
  return { order, map };
}

export default function LeadFieldBuilder({ initialFields, schemaReady }) {
  const router = useRouter();
  const [fields, setFields] = useState(initialFields);
  const [editing, setEditing] = useState(null);
  const [creatingIn, setCreatingIn] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [renamingSection, setRenamingSection] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragKey, setDragKey] = useState(null);

  function refresh() { router.refresh(); setEditing(null); setCreatingIn(null); }

  const { order: sectionOrder, map: bySection } = groupBySection(fields);

  async function remove(field) {
    if (!confirm(`Delete "${field.label}"? It will stop appearing on Add Lead, Edit Lead, and Query Forms. Any values already saved on existing leads stay visible on Lead Detail.`)) return;
    setBusyId(field.id);
    try {
      const res = await apiFetch(`/api/core/lead-custom-fields/${field.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Field deleted.");
      setFields((f) => f.filter((x) => x.id !== field.id));
    } catch { toast.error("Failed to delete."); } finally { setBusyId(null); }
  }

  async function persistFieldOrder(nextFields) {
    setFields(nextFields);
    try {
      await apiFetch("/api/core/lead-custom-fields/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: nextFields.map((f) => f.id) }) });
    } catch { toast.error("Failed to save order."); router.refresh(); }
  }

  function onDropField(section, dropIndex) {
    if (dragKey == null) return;
    const [dragSection, dragIndexStr] = dragKey.split("::");
    const dragIndex = Number(dragIndexStr);
    if (dragSection !== section || dragIndex === dropIndex) { setDragKey(null); return; }
    const sectionFields = [...bySection.get(section)];
    const [moved] = sectionFields.splice(dragIndex, 1);
    sectionFields.splice(dropIndex, 0, moved);

    const next = [];
    for (const s of sectionOrder) next.push(...(s === section ? sectionFields : bySection.get(s)));
    persistFieldOrder(next);
    setDragKey(null);
  }

  async function moveSectionBy(section, delta) {
    const idx = sectionOrder.indexOf(section);
    const swapWith = idx + delta;
    if (swapWith < 0 || swapWith >= sectionOrder.length) return;
    const nextOrder = [...sectionOrder];
    [nextOrder[idx], nextOrder[swapWith]] = [nextOrder[swapWith], nextOrder[idx]];
    const next = [];
    for (const s of nextOrder) next.push(...bySection.get(s));
    setFields(next);
    try {
      await apiFetch("/api/core/lead-custom-fields/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reorder", orderedSectionNames: nextOrder }) });
    } catch { toast.error("Failed to reorder sections."); router.refresh(); }
  }

  async function toggleSectionStatus(section) {
    const currentlyActive = bySection.get(section).some((f) => f.status === "active");
    const nextStatus = currentlyActive ? "inactive" : "active";
    try {
      const res = await apiFetch("/api/core/lead-custom-fields/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", section, status: nextStatus }) });
      if (!res.ok) throw new Error();
      toast.success(`Section ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      router.refresh();
    } catch { toast.error("Failed to update section."); }
  }

  async function submitRename(oldSection) {
    if (!renameValue.trim() || renameValue.trim() === oldSection) { setRenamingSection(null); return; }
    try {
      const res = await apiFetch("/api/core/lead-custom-fields/sections", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "rename", oldSection, newSection: renameValue.trim() }) });
      if (!res.ok) throw new Error();
      toast.success("Section renamed.");
      setRenamingSection(null);
      router.refresh();
    } catch { toast.error("Failed to rename section."); }
  }

  if (!schemaReady) {
    return (
      <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-amber-300 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Not available yet</p>
          <p className="text-amber-300/80 mt-1">This feature needs a database migration that hasn't been applied to this environment yet. The code is ready — it activates automatically once the migration runs.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-muted-foreground text-sm">Add custom fields to Add Lead, Edit Lead, Lead Detail, and Query Forms — fully custom, no code changes needed.</p>
        <button onClick={() => setCreatingIn("Custom Information")} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer shrink-0 ml-4">
          <Plus className="h-4 w-4" /> Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <EmptyState icon={ListTree} title="No custom fields yet" description="Add your first field, e.g. Visa Interview Date or Preferred Campus." />
      ) : (
        <div className="space-y-5">
          {sectionOrder.map((section, sIdx) => {
            const sectionFields = bySection.get(section);
            const sectionActive = sectionFields.some((f) => f.status === "active");
            return (
              <div key={section} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
                  <div className="flex flex-col shrink-0">
                    <button type="button" disabled={sIdx === 0} onClick={() => moveSectionBy(section, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button type="button" disabled={sIdx === sectionOrder.length - 1} onClick={() => moveSectionBy(section, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronDown className="h-3.5 w-3.5" /></button>
                  </div>
                  {renamingSection === section ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="px-2 py-1 rounded bg-card border border-border text-foreground text-sm flex-1 min-w-0" />
                      <button type="button" onClick={() => submitRename(section)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check className="h-4 w-4" /></button>
                      <button type="button" onClick={() => setRenamingSection(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><XIcon className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    <p className="text-foreground text-sm font-medium flex-1 min-w-0 truncate">
                      {section} {!sectionActive && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground ml-1">Inactive</span>}
                    </p>
                  )}
                  <button type="button" onClick={() => { setRenamingSection(section); setRenameValue(section); }} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 text-xs">Rename</button>
                  <button type="button" onClick={() => toggleSectionStatus(section)} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 text-xs">{sectionActive ? "Disable" : "Enable"}</button>
                  <button type="button" onClick={() => setCreatingIn(section)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0 text-xs"><Plus className="h-3.5 w-3.5" /> Field</button>
                </div>

                <div className="divide-y divide-border">
                  {sectionFields.map((field, i) => (
                    <div
                      key={field.id}
                      draggable
                      onDragStart={() => setDragKey(`${section}::${i}`)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); onDropField(section, i); }}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition cursor-grab active:cursor-grabbing"
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-foreground text-sm font-medium">{field.label}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">{TYPE_LABEL[field.field_type] || field.field_type}</span>
                          {field.status === "inactive" && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">Inactive</span>}
                        </div>
                        <p className="text-muted-foreground text-xs mt-0.5">
                          {field.show_on_lead_form ? `Lead Form${field.is_required_on_lead_form ? " (required)" : ""}` : "Not on Lead Form"}
                          {" · "}
                          {field.show_on_query_form ? `Query Form${field.is_required_on_query_form ? " (required)" : ""}` : "Not on Query Form"}
                        </p>
                      </div>
                      <button onClick={() => setEditing(field)} className="text-muted-foreground hover:text-foreground cursor-pointer transition shrink-0"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => remove(field)} disabled={busyId === field.id} className="text-muted-foreground hover:text-red-400 cursor-pointer transition shrink-0"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(creatingIn || editing) && (
        <LeadCustomFieldForm
          initial={editing}
          sections={sectionOrder.length ? sectionOrder : ["Custom Information"]}
          defaultSection={creatingIn}
          onClose={() => { setCreatingIn(null); setEditing(null); }}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
