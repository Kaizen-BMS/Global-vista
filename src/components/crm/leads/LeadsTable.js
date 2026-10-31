"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Eye, Phone, Mail, Contact2, UserPlus, UserMinus, Loader2, CheckCircle2, ArrowRightCircle, StickyNote, PencilLine } from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import EmptyState from "@/components/shared/EmptyState";
import DataTable from "@/components/shared/DataTable";
import { apiFetch } from "@/components/shared/apiClient";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import BulkNoteModal from "@/components/crm/leads/BulkNoteModal";
import NotesPopover from "@/components/crm/leads/NotesPopover";
import BulkPreviewEditModal from "@/components/crm/leads/BulkPreviewEditModal";

export default function LeadsTable({ leads, canBulkAssign, canBulkUpdate, canClaim, canManageNotes = false, currentUserId, assignableUsers = [], sortKey = "created_at", sortDir = "DESC", isChildCompany = false, stages = [], customFields = [] }) {
  const terms = getCrmTerms(isChildCompany);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [stageBusyId, setStageBusyId] = useState(null);
  const [notesLead, setNotesLead] = useState(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const streamOptions = customFields.find((f) => f.field_key === "stream")?.options || [];

  function nextStageFor(stage) {
    const idx = stages.indexOf(stage);
    return idx >= 0 ? stages[idx + 1] || null : null;
  }

  async function markStageComplete(id) {
    setStageBusyId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/stage-complete`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Marked complete.");
      router.refresh();
    } catch { toast.error("Failed to mark complete."); } finally { setStageBusyId(null); }
  }

  async function moveStageNext(id) {
    setStageBusyId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/stage-move`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to move to next stage.");
      toast.success("Moved to next stage.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setStageBusyId(null); }
  }

  async function bulkStageComplete() {
    setBulkBusy(true);
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "stageComplete", ids: selected }) });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} marked complete.`);
      setSelected([]); router.refresh();
    } catch { toast.error("Bulk mark complete failed."); } finally { setBulkBusy(false); }
  }

  async function bulkStageMove() {
    setBulkBusy(true);
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "stageMove", ids: selected }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      const failed = data.errors?.length || 0;
      if (failed) toast.error(`${failed} could not be moved (already on the last stage).`);
      if (selected.length - failed > 0) toast.success(`${selected.length - failed} moved to their next stage.`);
      setSelected([]); router.refresh();
    } catch { toast.error("Bulk move failed."); } finally { setBulkBusy(false); }
  }

  async function submitBulkPreviewUpdate(rows) {
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "bulkPreviewUpdate", rows }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bulk update failed.");
      const failed = data.errors?.length || 0;
      if (failed) toast.error(`${failed} student${failed === 1 ? "" : "s"} could not be updated.`);
      if (rows.length - failed > 0) toast.success(`${rows.length - failed} student${rows.length - failed === 1 ? "" : "s"} updated.`);
      setShowBulkEditModal(false); setSelected([]); router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  function toggleSelect(id) { setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])); }
  function toggleAll() { setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id)); }

  function handleSort(key) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", sortKey === key && sortDir === "ASC" ? "DESC" : "ASC");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function bulkSetStatus(status) {
    setBulkBusy(true);
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "status", ids: selected, status }) });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} leads updated.`);
      setSelected([]); router.refresh();
    } catch { toast.error("Bulk update failed."); } finally { setBulkBusy(false); }
  }

  async function bulkAssignTo() {
    if (!bulkAssignee) return;
    setBulkBusy(true);
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "assign", ids: selected, assignedTo: Number(bulkAssignee) }) });
      if (!res.ok) throw new Error();
      toast.success(`${selected.length} lead${selected.length === 1 ? "" : "s"} assigned.`);
      setSelected([]); setBulkAssignee(""); router.refresh();
    } catch { toast.error("Bulk assignment failed."); } finally { setBulkBusy(false); }
  }

  async function bulkAddNote(content) {
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "note", ids: selected, content }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add note.");
      toast.success(`Note added to ${data.addedCount} ${data.addedCount === 1 ? terms.singularLower : terms.pluralLower}.`);
      setShowNoteModal(false); setSelected([]); router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function claimLead(id) {
    setClaimingId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/claim`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `This ${terms.singularLower} has already been assigned.`);
      toast.success(`${terms.singular} claimed.`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setClaimingId(null); }
  }

  async function releaseLead(id) {
    if (!confirm(`Release this ${terms.singularLower} back to the unassigned pool?`)) return;
    setReleasingId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/release`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Failed to release ${terms.singularLower}.`);
      toast.success(`${terms.singular} released.`);
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setReleasingId(null); }
  }

  async function bulkRelease() {
    if (!confirm(`Release ${selected.length} ${selected.length === 1 ? terms.singularLower : terms.pluralLower} back to the unassigned pool?`)) return;
    setBulkBusy(true);
    try {
      const results = await Promise.allSettled(selected.map((id) => apiFetch(`/api/leads/${id}/release`, { method: "POST" })));
      const failed = results.filter((r) => r.status === "rejected" || !r.value.ok).length;
      if (failed) toast.error(`${failed} ${failed === 1 ? terms.singularLower : terms.pluralLower} could not be released.`);
      if (failed < selected.length) toast.success(`${selected.length - failed} ${selected.length - failed === 1 ? terms.singularLower : terms.pluralLower} released.`);
      setSelected([]); router.refresh();
    } finally { setBulkBusy(false); }
  }

  if (leads.length === 0) return <EmptyState icon={Contact2} title={`No ${terms.pluralLower} found`} description={`Try adjusting your filters or add a new ${terms.singularLower}.`} />;

  const columns = [
    { key: "lead_number", label: `${terms.singular} #`, width: 110, render: (l) => <span className="text-muted-foreground text-xs">{l.lead_number}</span> },
    ...(isChildCompany ? [{ key: "student_code", label: "Student ID", width: 130, sortable: true, render: (l) => <span className="text-muted-foreground text-xs">{l.student_code || "—"}</span> }] : []),
    {
      key: "name", label: "Name", width: 200, sortable: true, hideable: false,
      render: (l) => (
        <span className="flex items-center gap-2 min-w-0">
          <Link href={`/workspace/lead-management/${l.id}`} className="text-foreground hover:text-indigo-400 font-medium truncate">{l.name}</Link>
          {l.is_duplicate ? <span className="text-[10px] text-orange-400 shrink-0">DUPLICATE</span> : null}
        </span>
      ),
    },
    { key: "phone", label: "Phone", width: 140, render: (l) => l.phone },
    { key: "country", label: "Country", width: 120, render: (l) => l.country || "—" },
    {
      key: "source_name", label: "Source", width: 160,
      render: (l) => (
        <span className="flex flex-col min-w-0">
          <span className="truncate">{l.source_name}</span>
          {l.source_form_name && <span className="text-muted-foreground text-[10px] truncate">via {l.source_form_name}</span>}
        </span>
      ),
    },
    {
      key: "created_by_name", label: "Created By", width: 140,
      // created_by is only ever a real staff member for manually-created
      // leads — public-form and future automated-import leads never set
      // it, so they must read as "System", never blank (which could look
      // like missing data) and never a person's name that isn't real.
      render: (l) => l.created_by_name || (l.source_form_name ? "System (Form)" : "—"),
    },
    {
      key: "assigned_name", label: "Assigned", width: 170,
      render: (l) => {
        if (!l.assigned_to) {
          return canClaim ? (
            <button
              onClick={(e) => { e.stopPropagation(); claimLead(l.id); }}
              disabled={claimingId === l.id}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 cursor-pointer transition disabled:opacity-60"
            >
              {claimingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />} Take {terms.singular}
            </button>
          ) : "Unassigned";
        }
        // Release is only offered when it's actually your own claim, or
        // you hold leads.assign (the same permission bulk-assign uses) —
        // never a contradictory "Take Lead"/"Release" pair on someone
        // else's lead.
        const canReleaseThis = l.assigned_to === currentUserId || canBulkAssign;
        return (
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="truncate">{l.assigned_name}</span>
            {canReleaseThis && (
              <button
                onClick={(e) => { e.stopPropagation(); releaseLead(l.id); }}
                disabled={releasingId === l.id}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-muted hover:bg-red-500/10 text-muted-foreground hover:text-red-400 cursor-pointer transition disabled:opacity-60 shrink-0"
              >
                {releasingId === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserMinus className="h-3 w-3" />} Release
              </button>
            )}
          </span>
        );
      },
    },
    { key: "stage", label: "Stage", width: 130, sortable: true, render: (l) => <StageBadge stage={l.stage} /> },
    ...(isChildCompany ? [{
      key: "stage_status", label: "Stage Status", width: 190,
      render: (l) => {
        const completed = !!l.stage_completed_at;
        const next = nextStageFor(l.stage);
        const busy = stageBusyId === l.id;
        if (!completed) {
          return (
            <button onClick={(e) => { e.stopPropagation(); markStageComplete(l.id); }} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer transition disabled:opacity-60">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Mark Complete
            </button>
          );
        }
        if (!next) return <span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3 w-3" /> Completed</span>;
        return (
          <button onClick={(e) => { e.stopPropagation(); moveStageNext(l.id); }} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer transition disabled:opacity-60">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightCircle className="h-3 w-3" />} Move to {next}
            </button>
        );
      },
    }] : []),
    { key: "priority", label: "Priority", width: 110, sortable: true, render: (l) => <PriorityBadge priority={l.priority} /> },
    {
      key: "notes_quick", label: "Notes", width: 90, hideable: false,
      render: (l) => (
        <button onClick={(e) => { e.stopPropagation(); setNotesLead({ id: l.id, name: l.name }); }} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-muted hover:bg-indigo-500/10 text-muted-foreground hover:text-indigo-400 cursor-pointer transition">
          <StickyNote className="h-3.5 w-3.5" /> Notes
        </button>
      ),
    },
  ];

  return (
    <div>
      {selected.length > 0 && (canBulkAssign || canBulkUpdate || canClaim || canManageNotes) && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm flex-wrap">
          <span className="text-indigo-300 shrink-0">{selected.length} selected</span>
          {canBulkUpdate && (<>
            <button disabled={bulkBusy} onClick={() => bulkSetStatus("Hold")} className="text-foreground hover:text-foreground cursor-pointer disabled:opacity-60">Hold</button>
            <button disabled={bulkBusy} onClick={() => bulkSetStatus("Denied")} className="text-foreground hover:text-foreground cursor-pointer disabled:opacity-60">Deny</button>
          </>)}
          {selected.some((id) => {
            const l = leads.find((x) => x.id === id);
            return l && l.assigned_to && (l.assigned_to === currentUserId || canBulkAssign);
          }) && (
            <button disabled={bulkBusy} onClick={bulkRelease} className="flex items-center gap-1 text-muted-foreground hover:text-red-400 cursor-pointer disabled:opacity-60">
              <UserMinus className="h-3.5 w-3.5" /> Release Selected
            </button>
          )}
          {canBulkAssign && (
            <div className="flex items-center gap-2 ml-auto">
              <select
                value={bulkAssignee}
                onChange={(e) => setBulkAssignee(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs cursor-pointer"
              >
                <option value="">Assign to…</option>
                {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <button
                disabled={bulkBusy || !bulkAssignee}
                onClick={bulkAssignTo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition"
              >
                {bulkBusy && <Loader2 className="h-3 w-3 animate-spin" />} Assign {selected.length} {selected.length === 1 ? terms.singular : terms.plural}
              </button>
            </div>
          )}
          {canManageNotes && (
            <button disabled={bulkBusy} onClick={() => setShowNoteModal(true)} className="text-foreground hover:text-indigo-400 cursor-pointer disabled:opacity-60">Add Note</button>
          )}
          {isChildCompany && canBulkUpdate && (<>
            <button disabled={bulkBusy} onClick={bulkStageComplete} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer disabled:opacity-60">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
            </button>
            <button disabled={bulkBusy} onClick={bulkStageMove} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer disabled:opacity-60">
              <ArrowRightCircle className="h-3.5 w-3.5" /> Move to Next Stage
            </button>
            <button disabled={bulkBusy} onClick={() => setShowBulkEditModal(true)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer disabled:opacity-60">
              <PencilLine className="h-3.5 w-3.5" /> Bulk Edit
            </button>
          </>)}
          <button onClick={() => setSelected([])} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer shrink-0">Clear</button>
        </div>
      )}

      {showNoteModal && (
        <BulkNoteModal count={selected.length} singularLower={terms.singularLower} pluralLower={terms.pluralLower} onClose={() => setShowNoteModal(false)} onSubmit={bulkAddNote} />
      )}

      {notesLead && (
        <NotesPopover leadId={notesLead.id} leadName={notesLead.name} canManageNotes={canManageNotes} onClose={() => setNotesLead(null)} />
      )}

      {showBulkEditModal && (
        <BulkPreviewEditModal
          students={leads.filter((l) => selected.includes(l.id)).map((l) => ({ id: l.id, name: l.name, stage: l.stage }))}
          stages={stages}
          streamOptions={streamOptions}
          onClose={() => setShowBulkEditModal(false)}
          onSubmit={submitBulkPreviewUpdate}
        />
      )}

      <div className="hidden md:block">
        <DataTable
          tableId="leads"
          columns={columns}
          rows={leads}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          onRowClick={(l) => router.push(`/workspace/lead-management/${l.id}`)}
          leadingColumn={{
            width: 36,
            headerRender: () => <input type="checkbox" checked={selected.length === leads.length} onChange={toggleAll} onClick={(e) => e.stopPropagation()} className="cursor-pointer" />,
            render: (l) => <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} className="cursor-pointer" />,
          }}
          rowContextMenuItems={(l) => [
            { label: "View Details", icon: Eye, onClick: () => router.push(`/workspace/lead-management/${l.id}`) },
            { label: "Call", icon: Phone, onClick: () => { window.location.href = `tel:${l.phone}`; } },
            ...(l.email ? [{ label: "Email", icon: Mail, onClick: () => { window.location.href = `mailto:${l.email}`; } }] : []),
          ]}
        />
      </div>

      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          <Link key={lead.id} href={`/workspace/lead-management/${lead.id}`} className="block bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-foreground font-medium">{lead.name}</p>
              <PriorityBadge priority={lead.priority} />
            </div>
            <p className="text-muted-foreground text-xs mb-2">{lead.lead_number} · {lead.phone}</p>
            <div className="flex items-center justify-between">
              <StageBadge stage={lead.stage} />
              <span className="text-muted-foreground text-xs">{lead.assigned_name || "Unassigned"}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
