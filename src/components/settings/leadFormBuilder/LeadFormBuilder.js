"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Pencil, Trash2, GripVertical, ListTree, AlertTriangle, ChevronUp, ChevronDown,
  Check, X as XIcon, Eye, EyeOff, Lock, RotateCcw, Loader2,
} from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import LeadCustomFieldForm, { FIELD_TYPE_OPTIONS } from "@/components/forms/LeadCustomFieldForm";
import BuiltinFieldEditorModal from "@/components/settings/leadFormBuilder/BuiltinFieldEditorModal";
import LeadFormPreviewModal from "@/components/settings/leadFormBuilder/LeadFormPreviewModal";
import EmptyState from "@/components/shared/EmptyState";

const TYPE_LABEL = Object.fromEntries(FIELD_TYPE_OPTIONS.map((t) => [t.value, t.label]));

/** Adapts a merged custom-field row (from getFullLeadFormLayout) back into
 * the raw-DB-row shape LeadCustomFieldForm and the update API expect. */
function toCustomFieldPayload(field, overrides = {}) {
  return {
    section: field.section, label: field.label, helpText: field.helpText || "", placeholder: field.placeholder || "",
    defaultValue: field.defaultValue || "", fieldType: field.inputType, options: field.options || [],
    showOnLeadForm: field.showOnLeadForm, showOnLeadDetail: field.showOnLeadDetail, showOnQueryForm: field.showOnQueryForm,
    isRequiredOnLeadForm: field.isRequiredOnLeadForm, isRequiredOnQueryForm: field.isRequiredOnQueryForm,
    status: field.status,
    ...overrides,
  };
}
function toCustomFieldFormInitial(field) {
  return {
    id: field.id, section: field.section, label: field.label, help_text: field.helpText, placeholder: field.placeholder,
    default_value: field.defaultValue, field_type: field.inputType, options: field.options || [],
    show_on_lead_form: field.showOnLeadForm, show_on_lead_detail: field.showOnLeadDetail, show_on_query_form: field.showOnQueryForm,
    is_required_on_lead_form: field.isRequiredOnLeadForm, is_required_on_query_form: field.isRequiredOnQueryForm, status: field.status,
  };
}

function FieldRow({ field, sectionNames, onEdit, onToggleVisible, onMove, onDelete, busy, dragProps }) {
  const locked = field.coreRequired;
  return (
    <div {...dragProps} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition cursor-grab active:cursor-grabbing">
      <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      <button
        type="button" onClick={() => onToggleVisible(field)} disabled={locked || busy}
        title={locked ? "Required by the database — always visible" : field.showOnLeadForm ? "Visible on Add/Edit Lead — click to hide" : "Hidden — click to show"}
        className={`shrink-0 ${locked ? "text-muted-foreground/40" : field.showOnLeadForm ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground"} ${locked ? "" : "cursor-pointer"} transition`}
      >
        {field.showOnLeadForm ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-foreground text-sm font-medium">{field.label}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">
            {field.isCustom ? (TYPE_LABEL[field.inputType] || field.inputType) : "Built-in"}
          </span>
          {field.isRequiredOnLeadForm && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-red-500/30 text-red-400">Required</span>}
          {locked && <span title="Required by the database"><Lock className="h-3 w-3 text-amber-400" /></span>}
          {field.isCustom && field.status === "inactive" && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground">Inactive</span>}
        </div>
        <p className="text-muted-foreground text-xs mt-0.5">
          {field.showOnQueryForm ? `Query Form${field.isRequiredOnQueryForm ? " (required)" : ""}` : "Not on Query Form"}
          {" · "}
          {field.showOnLeadDetail ? "Lead Detail" : "Hidden on Lead Detail"}
        </p>
      </div>

      <select
        value={field.section} disabled={busy}
        onChange={(e) => onMove(field, e.target.value)}
        className="hidden sm:block px-2 py-1 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer shrink-0 max-w-[140px]"
        title="Move to section"
      >
        {sectionNames.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>

      <button onClick={() => onEdit(field)} className="text-muted-foreground hover:text-foreground cursor-pointer transition shrink-0"><Pencil className="h-4 w-4" /></button>
      {field.isCustom ? (
        <button onClick={() => onDelete(field)} disabled={busy} className="text-muted-foreground hover:text-red-400 cursor-pointer transition shrink-0"><Trash2 className="h-4 w-4" /></button>
      ) : (
        <span className="w-4 shrink-0" />
      )}
    </div>
  );
}

export default function LeadFormBuilder({ initialGroups, schemaReady }) {
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  useEffect(() => setGroups(initialGroups), [initialGroups]);

  const [editingBuiltin, setEditingBuiltin] = useState(null);
  const [editingCustom, setEditingCustom] = useState(null);
  const [creatingCustomIn, setCreatingCustomIn] = useState(null);
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSection, setNewSection] = useState({ name: "", description: "" });
  const [renamingSectionId, setRenamingSectionId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragKey, setDragKey] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [resetConfirming, setResetConfirming] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const sectionNames = groups.map((g) => g.section.name);
  const sectionsForPicker = groups.map((g) => g.section);

  function refresh() { router.refresh(); }

  async function createSection(e) {
    e.preventDefault();
    if (!newSection.name.trim()) { toast.error("Section name is required."); return; }
    try {
      const res = await apiFetch("/api/core/lead-field-sections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSection) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to create section.");
      toast.success("Section created.");
      setCreatingSection(false);
      setNewSection({ name: "", description: "" });
      refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function submitRename(section) {
    if (!renameValue.trim() || renameValue.trim() === section.name) { setRenamingSectionId(null); return; }
    try {
      const res = await apiFetch(`/api/core/lead-field-sections/${section.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: renameValue.trim(), description: section.description }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to rename section.");
      toast.success("Section renamed.");
      setRenamingSectionId(null);
      refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function toggleSectionStatus(section) {
    const nextStatus = section.status === "active" ? "inactive" : "active";
    try {
      const res = await apiFetch(`/api/core/lead-field-sections/${section.id}/status`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update section.");
      toast.success(`Section ${nextStatus === "active" ? "enabled" : "disabled"}.`);
      refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function moveSectionBy(section, delta) {
    const idx = sectionNames.indexOf(section.name);
    const swapWith = idx + delta;
    if (swapWith < 0 || swapWith >= groups.length) return;
    const nextGroups = [...groups];
    [nextGroups[idx], nextGroups[swapWith]] = [nextGroups[swapWith], nextGroups[idx]];
    setGroups(nextGroups);
    try {
      const res = await apiFetch("/api/core/lead-field-sections/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderedIds: nextGroups.map((g) => g.section.id).filter(Boolean) }) });
      if (!res.ok) throw new Error();
      refresh();
    } catch { toast.error("Failed to reorder sections."); refresh(); }
  }

  async function deleteSection(section) {
    if (!confirm(`Delete section "${section.name}"? It must be empty first.`)) return;
    try {
      const res = await apiFetch(`/api/core/lead-field-sections/${section.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to delete section.");
      toast.success("Section deleted.");
      refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function toggleVisible(field) {
    if (field.coreRequired) return;
    setBusyKey(field.key);
    try {
      if (field.isCustom) {
        const res = await apiFetch(`/api/core/lead-custom-fields/${field.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toCustomFieldPayload(field, { showOnLeadForm: !field.showOnLeadForm })) });
        if (!res.ok) throw new Error();
      } else {
        const res = await apiFetch("/api/core/lead-field-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fieldKey: field.key, showOnLeadForm: !field.showOnLeadForm }) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      refresh();
    } catch (err) { toast.error(err?.message || "Failed to update field."); } finally { setBusyKey(null); }
  }

  async function moveField(field, newSectionName) {
    if (newSectionName === field.section) return;
    setBusyKey(field.key);
    try {
      if (field.isCustom) {
        const res = await apiFetch(`/api/core/lead-custom-fields/${field.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toCustomFieldPayload(field, { section: newSectionName })) });
        if (!res.ok) throw new Error();
      } else {
        const targetSection = sectionsForPicker.find((s) => s.name === newSectionName);
        const res = await apiFetch("/api/core/lead-field-layout", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fieldKey: field.key, sectionId: targetSection?.id || null }) });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      toast.success(`Moved to "${newSectionName}".`);
      refresh();
    } catch (err) { toast.error(err?.message || "Failed to move field."); } finally { setBusyKey(null); }
  }

  async function deleteCustomField(field) {
    if (!confirm(`Delete "${field.label}"? It will stop appearing on Add Lead, Edit Lead, and Query Forms. Any values already saved on existing leads stay visible on Lead Detail.`)) return;
    setBusyKey(field.key);
    try {
      const res = await apiFetch(`/api/core/lead-custom-fields/${field.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Field deleted.");
      refresh();
    } catch { toast.error("Failed to delete."); } finally { setBusyKey(null); }
  }

  function onDropField(sectionName, dropIndex) {
    if (dragKey == null) return;
    const [dragSection, dragIndexStr] = dragKey.split("::");
    const dragIndex = Number(dragIndexStr);
    setDragKey(null);
    if (dragSection !== sectionName || dragIndex === dropIndex) return;
    const group = groups.find((g) => g.section.name === sectionName);
    const fields = [...group.fields];
    const [moved] = fields.splice(dragIndex, 1);
    fields.splice(dropIndex, 0, moved);
    setGroups(groups.map((g) => (g.section.name === sectionName ? { ...g, fields } : g)));

    apiFetch("/api/core/lead-field-layout/reorder", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionName, orderedRefs: fields.map((f) => ({ isCustom: f.isCustom, id: f.id, key: f.key })) }),
    }).then((res) => { if (!res.ok) throw new Error(); refresh(); })
      .catch(() => { toast.error("Failed to save order."); refresh(); });
  }

  async function resetForm() {
    setResetConfirming(false);
    try {
      const res = await apiFetch("/api/core/lead-field-layout/reset", { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Lead form reset to default. Custom fields and lead data were not affected.");
      refresh();
    } catch { toast.error("Failed to reset."); }
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
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <p className="text-muted-foreground text-sm max-w-2xl">
          Fully customize your Add Lead / Edit Lead form — reorder or relabel built-in fields, hide the ones you don't need, and add unlimited custom fields, all grouped into your own sections.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setPreviewOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer hover:bg-muted transition"><Eye className="h-4 w-4" /> Preview</button>
          <button onClick={() => setResetConfirming(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer hover:bg-muted transition"><RotateCcw className="h-4 w-4" /> Reset Form</button>
          <button onClick={() => setCreatingSection(true)} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer"><Plus className="h-4 w-4" /> Add Section</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <EmptyState icon={ListTree} title="No sections yet" description="Add your first section to start building your Lead Form." />
      ) : (
        <div className="space-y-5">
          {groups.map((g, sIdx) => (
            <div key={g.section.name} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/40 border-b border-border">
                <div className="flex flex-col shrink-0">
                  <button type="button" disabled={sIdx === 0} onClick={() => moveSectionBy(g.section, -1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronUp className="h-3.5 w-3.5" /></button>
                  <button type="button" disabled={sIdx === groups.length - 1} onClick={() => moveSectionBy(g.section, 1)} className="text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer"><ChevronDown className="h-3.5 w-3.5" /></button>
                </div>
                {renamingSectionId === g.section.id ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="px-2 py-1 rounded bg-card border border-border text-foreground text-sm flex-1 min-w-0" />
                    <button type="button" onClick={() => submitRename(g.section)} className="text-emerald-400 hover:text-emerald-300 cursor-pointer"><Check className="h-4 w-4" /></button>
                    <button type="button" onClick={() => setRenamingSectionId(null)} className="text-muted-foreground hover:text-foreground cursor-pointer"><XIcon className="h-4 w-4" /></button>
                  </div>
                ) : (
                  <p className="text-foreground text-sm font-medium flex-1 min-w-0 truncate">
                    {g.section.name} {g.section.status === "inactive" && <span className="text-[10px] px-1.5 py-0.5 rounded-md border border-border text-muted-foreground ml-1">Inactive</span>}
                  </p>
                )}
                {g.section.id && (
                  <>
                    <button type="button" onClick={() => { setRenamingSectionId(g.section.id); setRenameValue(g.section.name); }} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 text-xs">Rename</button>
                    <button type="button" onClick={() => toggleSectionStatus(g.section)} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 text-xs">{g.section.status === "active" ? "Disable" : "Enable"}</button>
                    <button type="button" onClick={() => deleteSection(g.section)} className="text-muted-foreground hover:text-red-400 cursor-pointer shrink-0 text-xs">Delete</button>
                  </>
                )}
                <button type="button" onClick={() => setCreatingCustomIn(g.section.name)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer shrink-0 text-xs"><Plus className="h-3.5 w-3.5" /> Field</button>
              </div>

              {g.fields.length === 0 ? (
                <p className="text-muted-foreground text-xs px-4 py-4">No fields in this section yet.</p>
              ) : (
                <div className="divide-y divide-border">
                  {g.fields.map((field, i) => (
                    <FieldRow
                      key={field.key} field={field} sectionNames={sectionNames} busy={busyKey === field.key}
                      onEdit={(f) => (f.isCustom ? setEditingCustom(f) : setEditingBuiltin(f))}
                      onToggleVisible={toggleVisible} onMove={moveField} onDelete={deleteCustomField}
                      dragProps={{
                        draggable: true,
                        onDragStart: () => setDragKey(`${g.section.name}::${i}`),
                        onDragOver: (e) => e.preventDefault(),
                        onDrop: (e) => { e.preventDefault(); onDropField(g.section.name, i); },
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {creatingSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCreatingSection(false)} />
          <form onSubmit={createSection} className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5">
            <p className="text-foreground font-semibold mb-4">New Section</p>
            <label className="block text-sm text-foreground mb-1">Name *</label>
            <input autoFocus required value={newSection.name} onChange={(e) => setNewSection({ ...newSection, name: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-3" placeholder="e.g. Generator Requirement" />
            <label className="block text-sm text-foreground mb-1">Description</label>
            <input value={newSection.description} onChange={(e) => setNewSection({ ...newSection, description: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-5" placeholder="Optional" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCreatingSection(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Cancel</button>
              <button type="submit" className="btn-brand px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer">Create</button>
            </div>
          </form>
        </div>
      )}

      {resetConfirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setResetConfirming(false)} />
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5">
            <p className="text-foreground font-semibold mb-2">Reset Lead Form?</p>
            <p className="text-muted-foreground text-sm mb-5">This resets sections and built-in field configuration to the system default. Your custom fields and all existing lead data stay exactly as they are.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setResetConfirming(false)} className="px-4 py-2 rounded-lg bg-muted text-foreground text-sm cursor-pointer">Cancel</button>
              <button onClick={resetForm} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium cursor-pointer"><RotateCcw className="h-4 w-4" /> Reset</button>
            </div>
          </div>
        </div>
      )}

      {previewOpen && <LeadFormPreviewModal groups={groups} onClose={() => setPreviewOpen(false)} />}

      {editingBuiltin && (
        <BuiltinFieldEditorModal field={editingBuiltin} sections={sectionsForPicker} onClose={() => setEditingBuiltin(null)} onSaved={() => { setEditingBuiltin(null); refresh(); }} />
      )}

      {(creatingCustomIn || editingCustom) && (
        <LeadCustomFieldForm
          initial={editingCustom ? toCustomFieldFormInitial(editingCustom) : null}
          sections={sectionNames.length ? sectionNames : ["Custom Information"]}
          defaultSection={creatingCustomIn}
          onClose={() => { setCreatingCustomIn(null); setEditingCustom(null); }}
          onSaved={() => { setCreatingCustomIn(null); setEditingCustom(null); refresh(); }}
        />
      )}
    </div>
  );
}
