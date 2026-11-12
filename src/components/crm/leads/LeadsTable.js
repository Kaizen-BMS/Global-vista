"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Eye, Phone, Mail, Contact2, UserPlus, UserMinus, Loader2, CheckCircle2, ArrowRightCircle, ArrowLeftCircle, StickyNote, PencilLine, Send, Building2 } from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import EmptyState from "@/components/shared/EmptyState";
import DataTable from "@/components/shared/DataTable";
import { apiFetch } from "@/components/shared/apiClient";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import BulkNoteModal from "@/components/crm/leads/BulkNoteModal";
import NotesPopover from "@/components/crm/leads/NotesPopover";
import BulkPreviewEditModal from "@/components/crm/leads/BulkPreviewEditModal";
import BulkEmailModal from "@/components/crm/leads/BulkEmailModal";
import StageNoteModal from "@/components/crm/leads/StageNoteModal";
import { openLeadAcrossCompanies } from "@/lib/helpers/peekLead";

export default function LeadsTable({ leads, canBulkAssign, canBulkUpdate, canClaim, canManageNotes = false, currentUserId, assignableUsers = [], sortKey = "created_at", sortDir = "DESC", isChildCompany = false, stages = [], customFields = [], aggregated = false, homeCompanyId = null, gveCompanyId = null, totalCount = null }) {
  const terms = getCrmTerms(isChildCompany);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState([]);
  // Gmail-style "All N on this page are selected. Select all M matching
  // your filters" — true once the user explicitly asks to go beyond the
  // current page; every bulk action below then resolves the REAL, live id
  // list via resolveBulkIds() instead of trusting `selected`.
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [claimingId, setClaimingId] = useState(null);
  const [releasingId, setReleasingId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [stageBusyId, setStageBusyId] = useState(null);
  const [notesLead, setNotesLead] = useState(null);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [stageNoteAction, setStageNoteAction] = useState(null); // { id, kind: "complete" | "next" | "prev", label }
  const [bulkStageNoteKind, setBulkStageNoteKind] = useState(null); // "next" | "prev"
  const [savingGradeId, setSavingGradeId] = useState(null);
  const predictedGradeField = customFields.find((f) => f.field_key === "predicted_grade");
  const streamOptions = customFields.find((f) => f.field_key === "stream")?.options || [];
  const selectedCount = selectAllMatching ? (totalCount ?? selected.length) : selected.length;

  function clearSelection() { setSelected([]); setSelectAllMatching(false); }

  // The REAL id list a bulk action should run against — every page's
  // worth of ids while just paging-level selection is active, or every id
  // matching the current filters (resolved fresh, not cached from
  // whatever's on screen) once "Select all N matching" has been clicked.
  async function resolveBulkIds() {
    if (!selectAllMatching) return selected;
    const res = await apiFetch(`/api/leads/ids?${searchParams.toString()}`);
    const data = await res.json().catch(() => ({}));
    return data.ids || selected;
  }

  // Shared by every bulk action that mutates something (stage/status/
  // assign/release) — the action doesn't actually run for 10 seconds, so
  // clicking "Undo" on the toast means NOTHING ever touched the database,
  // same idea as Gmail's own "Archived. Undo" snackbar. Selection clears
  // immediately either way, matching that same feel.
  function runBulkWithUndo(label, run) {
    let cancelled = false;
    const timer = setTimeout(() => { if (!cancelled) run(); }, 10000);
    toast(label, {
      duration: 10000,
      action: { label: "Undo", onClick: () => { cancelled = true; clearTimeout(timer); toast.success("Undone — nothing was changed."); } },
    });
  }

  // A lead's own detail page is strictly scoped to session.company_id —
  // in GVE's combined (aggregated) view, a row usually belongs to some
  // OTHER company (a school), so opening it switches the whole session
  // into that school first (same existing "Switch to Company" mechanism
  // UserMenu.js already uses), then navigates. An "Independent" row
  // (company_id === gveCompanyId) needs no switch, only an exit if
  // currently switched somewhere else. Non-aggregated callers never hit
  // this branch — same plain navigation as always.
  async function openLead(l) {
    if (!aggregated) { router.push(`/workspace/lead-management/${l.id}`); return; }
    try { await openLeadAcrossCompanies({ router, leadId: l.id, companyId: l.company_id, homeCompanyId, gveCompanyId }); }
    catch (err) { toast.error(err.message); }
  }

  function nextStageFor(stage) {
    const idx = stages.indexOf(stage);
    return idx >= 0 ? stages[idx + 1] || null : null;
  }

  function prevStageFor(stage) {
    const idx = stages.indexOf(stage);
    return idx > 0 ? stages[idx - 1] : null;
  }

  // A note is never required for a stage action, but always offered —
  // see StageNoteModal. Posted after the stage change itself succeeds, so
  // a failed stage change never leaves an orphaned note behind.
  async function addNoteFor(id, note) {
    if (!note) return;
    try { await apiFetch(`/api/leads/${id}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: note }) }); }
    catch { toast.error("Stage updated, but the note failed to save."); }
  }

  async function markStageComplete(id, note = "") {
    setStageBusyId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/stage-complete`, { method: "POST" });
      if (!res.ok) throw new Error();
      await addNoteFor(id, note);
      toast.success("Marked complete.");
      router.refresh();
    } catch { toast.error("Failed to mark complete."); } finally { setStageBusyId(null); }
  }

  async function moveStageNext(id, note = "") {
    setStageBusyId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/stage-move`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to move to next stage.");
      await addNoteFor(id, note);
      toast.success("Moved to next stage.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setStageBusyId(null); }
  }

  async function moveStagePrev(id, note = "") {
    setStageBusyId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/stage-move-back`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to move to previous stage.");
      await addNoteFor(id, note);
      toast.success("Moved back a stage.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setStageBusyId(null); }
  }

  async function confirmStageNote(note) {
    const { id, kind } = stageNoteAction;
    setStageNoteAction(null);
    if (kind === "complete") await markStageComplete(id, note);
    else if (kind === "next") await moveStageNext(id, note);
    else if (kind === "prev") await moveStagePrev(id, note);
  }

  async function bulkStageComplete() {
    const ids = await resolveBulkIds();
    const count = ids.length;
    clearSelection();
    runBulkWithUndo(`Marking ${count} complete…`, async () => {
      try {
        const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "stageComplete", ids }) });
        if (!res.ok) throw new Error();
        toast.success(`${count} marked complete.`);
        router.refresh();
      } catch { toast.error("Bulk mark complete failed."); }
    });
  }

  async function bulkStageMove(note = "") {
    const ids = await resolveBulkIds();
    const count = ids.length;
    clearSelection();
    runBulkWithUndo(`Moving ${count} to their next stage…`, async () => {
      try {
        const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "stageMove", ids, note }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        const failed = data.errors?.length || 0;
        if (failed) toast.error(`${failed} could not be moved (already on the last stage).`);
        if (count - failed > 0) toast.success(`${count - failed} moved to their next stage.`);
        router.refresh();
      } catch { toast.error("Bulk move failed."); }
    });
  }

  async function bulkStageMovePrev(note = "") {
    const ids = await resolveBulkIds();
    const count = ids.length;
    clearSelection();
    runBulkWithUndo(`Moving ${count} back a stage…`, async () => {
      try {
        const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "stageMoveBack", ids, note }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error();
        const failed = data.errors?.length || 0;
        if (failed) toast.error(`${failed} could not be moved back (already on the first stage).`);
        if (count - failed > 0) toast.success(`${count - failed} moved back a stage.`);
        router.refresh();
      } catch { toast.error("Bulk move back failed."); }
    });
  }

  // Shared by both bulk stage buttons — a note here is never required, but
  // always offered (same reasoning as the single-lead StageNoteModal), and
  // applied as the SAME note text to every lead the move actually succeeds
  // on, so there's one common record of why the group moved.
  async function confirmBulkStageNote(note) {
    const kind = bulkStageNoteKind;
    setBulkStageNoteKind(null);
    if (kind === "next") await bulkStageMove(note);
    else if (kind === "prev") await bulkStageMovePrev(note);
  }

  async function submitBulkPreviewUpdate(rows) {
    try {
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "bulkPreviewUpdate", rows }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Bulk update failed.");
      const failed = data.errors?.length || 0;
      if (failed) toast.error(`${failed} student${failed === 1 ? "" : "s"} could not be updated.`);
      if (rows.length - failed > 0) toast.success(`${rows.length - failed} student${rows.length - failed === 1 ? "" : "s"} updated.`);
      setShowBulkEditModal(false); clearSelection(); router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  function toggleSelect(id) { setSelectAllMatching(false); setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])); }
  function toggleAll() { setSelectAllMatching(false); setSelected(selected.length === leads.length ? [] : leads.map((l) => l.id)); }

  function handleSort(key) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", sortKey === key && sortDir === "ASC" ? "DESC" : "ASC");
    router.push(`${pathname}?${params.toString()}`);
  }

  async function bulkSetStatus(status) {
    const ids = await resolveBulkIds();
    const count = ids.length;
    clearSelection();
    runBulkWithUndo(`Updating ${count} leads…`, async () => {
      try {
        const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "status", ids, status }) });
        if (!res.ok) throw new Error();
        toast.success(`${count} leads updated.`);
        router.refresh();
      } catch { toast.error("Bulk update failed."); }
    });
  }

  async function bulkAssignTo() {
    if (!bulkAssignee) return;
    const assignee = bulkAssignee;
    const ids = await resolveBulkIds();
    const count = ids.length;
    clearSelection(); setBulkAssignee("");
    runBulkWithUndo(`Assigning ${count} lead${count === 1 ? "" : "s"}…`, async () => {
      try {
        const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "assign", ids, assignedTo: Number(assignee) }) });
        if (!res.ok) throw new Error();
        toast.success(`${count} lead${count === 1 ? "" : "s"} assigned.`);
        router.refresh();
      } catch { toast.error("Bulk assignment failed."); }
    });
  }

  async function bulkAddNote(content) {
    try {
      const ids = await resolveBulkIds();
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "note", ids, content }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add note.");
      toast.success(`Note added to ${data.addedCount} ${data.addedCount === 1 ? terms.singularLower : terms.pluralLower}.`);
      setShowNoteModal(false); clearSelection(); router.refresh();
    } catch (err) { toast.error(err.message); }
  }

  async function bulkSendEmail(subject, message) {
    try {
      const ids = await resolveBulkIds();
      const res = await apiFetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bulkAction: "sendEmail", ids, subject, message }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send email.");
      const parts = [`${data.sentCount} emailed`];
      if (data.skippedCount) parts.push(`${data.skippedCount} skipped (no email on file)`);
      if (data.failedCount) parts.push(`${data.failedCount} failed`);
      toast.success(parts.join(", ") + ".");
      setShowEmailModal(false); clearSelection(); router.refresh();
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

  // Predicted Grade is the one custom field shown as an actual column on
  // this list (every other custom field only shows on the lead's own
  // detail page/Bulk Edit/Excel). On GVE's combined view `id` usually
  // belongs to a school, not GVE itself, and that school's own field id
  // isn't known up front (every school keeps its own separate row) — the
  // dedicated predicted-grade endpoint resolves it server-side by key
  // there, same as every other cross-company write in this app.
  async function updatePredictedGrade(id, value) {
    if (!predictedGradeField) return;
    setSavingGradeId(id);
    try {
      const res = await apiFetch(`/api/leads/${id}/predicted-grade`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldId: predictedGradeField.id, value }),
      });
      if (!res.ok) throw new Error("Failed to update predicted grade.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setSavingGradeId(null); }
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
      key: "name", label: "Name", width: 200, sortable: !aggregated, hideable: false,
      render: (l) => (
        <span className="flex items-center gap-2 min-w-0">
          {aggregated ? (
            <button onClick={(e) => { e.stopPropagation(); openLead(l); }} className="text-foreground hover:text-indigo-400 font-medium truncate text-left cursor-pointer">{l.name}</button>
          ) : (
            <Link href={`/workspace/lead-management/${l.id}`} className="text-foreground hover:text-indigo-400 font-medium truncate">{l.name}</Link>
          )}
          {l.is_duplicate ? <span className="text-[10px] text-orange-400 shrink-0">DUPLICATE</span> : null}
        </span>
      ),
    },
    ...(aggregated ? [{
      key: "school_name", label: "School", width: 170,
      render: (l) => l.school_name ? (
        <span className="flex items-center gap-1.5 text-foreground min-w-0"><Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" /><span className="truncate">{l.school_name}</span></span>
      ) : (
        <span className="px-2 py-0.5 rounded-full text-[11px] border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Direct Lead</span>
      ),
    }] : []),
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
    ...((isChildCompany || aggregated) && predictedGradeField ? [{
      key: "predicted_grade", label: "Predicted Grade", width: 170,
      render: (l) => (
        <span className="flex items-center gap-1.5">
          <select
            value={l.predicted_grade || ""}
            disabled={savingGradeId === l.id}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); updatePredictedGrade(l.id, e.target.value); }}
            className="w-full px-2 py-1 rounded-md bg-muted border border-border text-foreground text-xs cursor-pointer disabled:opacity-60"
          >
            <option value="">Not set</option>
            {predictedGradeField.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          {savingGradeId === l.id && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
        </span>
      ),
    }] : []),
    ...(isChildCompany ? [{
      key: "stage_status", label: "Stage Status", width: 190,
      render: (l) => {
        const completed = !!l.stage_completed_at;
        const next = nextStageFor(l.stage);
        const prev = prevStageFor(l.stage);
        const busy = stageBusyId === l.id;
        const backBtn = prev && (
          <button onClick={(e) => { e.stopPropagation(); setStageNoteAction({ id: l.id, kind: "prev", label: "Move Back" }); }} disabled={busy} title={`Move back to ${prev}`} className="flex items-center justify-center h-6 w-6 rounded-md bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground cursor-pointer transition disabled:opacity-60 shrink-0">
            <ArrowLeftCircle className="h-3.5 w-3.5" />
          </button>
        );
        if (!completed) {
          return (
            <span className="flex items-center gap-1.5">
              {backBtn}
              <button onClick={(e) => { e.stopPropagation(); setStageNoteAction({ id: l.id, kind: "complete", label: "Mark Complete" }); }} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 cursor-pointer transition disabled:opacity-60">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />} Mark Complete
              </button>
            </span>
          );
        }
        if (!next) return <span className="flex items-center gap-1.5">{backBtn}<span className="flex items-center gap-1 text-emerald-400 text-xs"><CheckCircle2 className="h-3 w-3" /> Completed</span></span>;
        return (
          <span className="flex items-center gap-1.5">
            {backBtn}
            <button onClick={(e) => { e.stopPropagation(); setStageNoteAction({ id: l.id, kind: "next", label: `Move to ${next}` }); }} disabled={busy} className="flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer transition disabled:opacity-60">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowRightCircle className="h-3 w-3" />} Move to {next}
            </button>
          </span>
        );
      },
    }] : []),
    ...(isChildCompany ? [] : [{ key: "priority", label: "Priority", width: 110, sortable: true, render: (l) => <PriorityBadge priority={l.priority} /> }]),
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
      {selected.length > 0 && selected.length === leads.length && !selectAllMatching && totalCount != null && totalCount > leads.length && (
        <div className="mb-2 px-4 py-2 bg-muted border border-border rounded-lg text-xs text-muted-foreground">
          All {leads.length} {leads.length === 1 ? terms.singularLower : terms.pluralLower} on this page are selected.{" "}
          <button onClick={() => setSelectAllMatching(true)} className="text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer">
            Select all {totalCount} {totalCount === 1 ? terms.singularLower : terms.pluralLower} matching your filters
          </button>
        </div>
      )}

      {selected.length > 0 && (canBulkAssign || canBulkUpdate || canClaim || canManageNotes) && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-sm flex-wrap">
          <span className="text-indigo-300 shrink-0">
            {selectAllMatching ? `All ${selectedCount} ${selectedCount === 1 ? terms.singularLower : terms.pluralLower} selected` : `${selectedCount} selected`}
          </span>
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
          {/* Assigning across companies doesn't mean anything — the
              assignable-users list here is only ever GVE's own employees,
              never a school's — so this stays hidden for the combined
              view. */}
          {canBulkAssign && !aggregated && (
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
                {bulkBusy && <Loader2 className="h-3 w-3 animate-spin" />} Assign {selectedCount} {selectedCount === 1 ? terms.singular : terms.plural}
              </button>
            </div>
          )}
          {canManageNotes && (<>
            <button disabled={bulkBusy} onClick={() => setShowNoteModal(true)} className="text-foreground hover:text-indigo-400 cursor-pointer disabled:opacity-60">Add Note</button>
            {/* Bulk email isn't wired up cross-company yet — hidden for
                the combined view rather than shipping something that
                would silently skip every row outside GVE's own. */}
            {!aggregated && (
              <button disabled={bulkBusy} onClick={() => setShowEmailModal(true)} className="flex items-center gap-1 text-foreground hover:text-indigo-400 cursor-pointer disabled:opacity-60">
                <Send className="h-3.5 w-3.5" /> Send Email
              </button>
            )}
          </>)}
          {isChildCompany && canBulkUpdate && (<>
            <button disabled={bulkBusy} onClick={bulkStageComplete} className="flex items-center gap-1 text-amber-400 hover:text-amber-300 cursor-pointer disabled:opacity-60">
              <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
            </button>
            <button disabled={bulkBusy} onClick={() => setBulkStageNoteKind("next")} className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 cursor-pointer disabled:opacity-60">
              <ArrowRightCircle className="h-3.5 w-3.5" /> Move to Next Stage
            </button>
            <button disabled={bulkBusy} onClick={() => setBulkStageNoteKind("prev")} className="flex items-center gap-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-60">
              <ArrowLeftCircle className="h-3.5 w-3.5" /> Move Back
            </button>
            <button disabled={bulkBusy} onClick={() => setShowBulkEditModal(true)} className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 cursor-pointer disabled:opacity-60">
              <PencilLine className="h-3.5 w-3.5" /> Bulk Edit
            </button>
          </>)}
          <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer shrink-0">Clear</button>
        </div>
      )}

      {showNoteModal && (
        <BulkNoteModal count={selectedCount} singularLower={terms.singularLower} pluralLower={terms.pluralLower} onClose={() => setShowNoteModal(false)} onSubmit={bulkAddNote} />
      )}

      {notesLead && (
        <NotesPopover leadId={notesLead.id} leadName={notesLead.name} canManageNotes={canManageNotes} onClose={() => setNotesLead(null)} />
      )}

      {showEmailModal && (
        <BulkEmailModal count={selectedCount} singularLower={terms.singularLower} pluralLower={terms.pluralLower} onClose={() => setShowEmailModal(false)} onSubmit={bulkSendEmail} />
      )}

      {stageNoteAction && (
        <StageNoteModal title={stageNoteAction.label} onClose={() => setStageNoteAction(null)} onConfirm={confirmStageNote} />
      )}

      {bulkStageNoteKind && (
        <StageNoteModal
          title={bulkStageNoteKind === "next" ? `Move ${selectedCount} to Next Stage` : `Move ${selectedCount} Back`}
          onClose={() => setBulkStageNoteKind(null)}
          onConfirm={confirmBulkStageNote}
        />
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
          tableId={isChildCompany ? "students" : "leads"}
          defaultHiddenColumns={isChildCompany ? ["country", "source_name", "created_by_name"] : []}
          columns={columns}
          rows={leads}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={aggregated ? undefined : handleSort}
          onRowClick={openLead}
          leadingColumn={{
            width: 36,
            headerRender: () => <input type="checkbox" checked={selected.length === leads.length} onChange={toggleAll} onClick={(e) => e.stopPropagation()} className="cursor-pointer" />,
            render: (l) => <input type="checkbox" checked={selected.includes(l.id)} onChange={() => toggleSelect(l.id)} className="cursor-pointer" />,
          }}
          rowContextMenuItems={(l) => [
            { label: "View Details", icon: Eye, onClick: () => openLead(l) },
            { label: "Call", icon: Phone, onClick: () => { window.location.href = `tel:${l.phone}`; } },
            ...(l.email ? [{ label: "Email", icon: Mail, onClick: () => { window.location.href = `mailto:${l.email}`; } }] : []),
          ]}
        />
      </div>

      <div className="md:hidden space-y-3">
        {leads.map((lead) => (
          aggregated ? (
            <button key={lead.id} onClick={() => openLead(lead)} className="block w-full text-left bg-card border border-border rounded-xl p-4 cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground font-medium">{lead.name}</p>
                <PriorityBadge priority={lead.priority} />
              </div>
              <p className="text-muted-foreground text-xs mb-2">{lead.lead_number} · {lead.phone}</p>
              <div className="flex items-center justify-between">
                <StageBadge stage={lead.stage} />
                <span className="text-muted-foreground text-xs">{lead.school_name || "Direct Lead"}</span>
              </div>
            </button>
          ) : (
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
          )
        ))}
      </div>
    </div>
  );
}
