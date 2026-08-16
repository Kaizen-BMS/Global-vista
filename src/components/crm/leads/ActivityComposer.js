"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X, CalendarClock, CalendarDays, StickyNote, Phone, Mail, Sparkles } from "lucide-react";
import { FOLLOWUP_TYPES, FOLLOWUP_DISPOSITIONS, MEETING_TYPES } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

const inputClass = "w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";
function Field({ label, children }) { return (<div><label className="block text-xs text-muted-foreground mb-1.5">{label}</label>{children}</div>); }

function ModalShell({ title, onClose, children, onSubmit, saving, submitLabel = "Save" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <form onSubmit={onSubmit} className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">{title}</p>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4">{children}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function FollowupModal({ leadId, onClose, onSaved }) {
  const [type, setType] = useState(FOLLOWUP_TYPES[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!scheduledAt) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, scheduledAt, notes: notes || null }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to schedule follow-up.");
      toast.success("Follow-up scheduled.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Schedule Follow-up" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Schedule">
      <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>{FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
      <Field label="Date & Time *"><input required type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={inputClass} /></Field>
      <Field label="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Reason / what to discuss" /></Field>
    </ModalShell>
  );
}

function MeetingModal({ leadId, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState(MEETING_TYPES[0]);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [locationOrUrl, setLocationOrUrl] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/meetings`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, meetingType, startsAt, endsAt, locationOrUrl: locationOrUrl || null, participants: participants || null, notes: notes || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to schedule meeting.");
      toast.success("Meeting scheduled.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Schedule Meeting" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Schedule">
      <Field label="Title *"><input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Application discussion" /></Field>
      <Field label="Type"><select value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className={inputClass}>{MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts *"><input required type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} /></Field>
        <Field label="Ends *"><input required type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} /></Field>
      </div>
      <Field label="Location / Meeting URL"><input value={locationOrUrl} onChange={(e) => setLocationOrUrl(e.target.value)} className={inputClass} placeholder="Google Meet link, office address, etc." /></Field>
      <Field label="Participants"><input value={participants} onChange={(e) => setParticipants(e.target.value)} className={inputClass} placeholder="Names or emails, comma-separated" /></Field>
      <Field label="Notes"><textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} /></Field>
    </ModalShell>
  );
}

function NoteModal({ leadId, onClose, onSaved }) {
  const NOTE_TYPES = [{ value: "general", label: "General Note" }, { value: "call", label: "Call Note" }, { value: "meeting", label: "Meeting Note" }, { value: "follow_up", label: "Follow-up Note" }, { value: "internal", label: "Internal Note" }];
  const [type, setType] = useState("general");
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, type, visibility }) });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to add note.");
      toast.success("Note added.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title="Add Note" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Add Note">
      <Field label="Note Type"><select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>{NOTE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></Field>
      <Field label="Content *"><textarea required autoFocus rows={4} value={content} onChange={(e) => setContent(e.target.value)} className={inputClass} /></Field>
      <Field label="Visibility">
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className={inputClass}>
          <option value="public">Public — visible to the team</option>
          <option value="private">Private — visible only to you</option>
        </select>
      </Field>
    </ModalShell>
  );
}

function QuickLogModal({ leadId, activityType, onClose, onSaved }) {
  const [note, setNote] = useState("");
  const [disposition, setDisposition] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "quickLog", type: activityType, note, disposition: disposition || null, nextFollowUp: nextFollowUp || null }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to log activity.");
      toast.success("Activity logged.");
      onSaved();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <ModalShell title={`Log ${activityType}`} onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Log Activity">
      <Field label="What happened?"><textarea autoFocus rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} /></Field>
      <Field label="Disposition">
        <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className={inputClass}>
          <option value="">Not set</option>
          {FOLLOWUP_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Next follow-up (optional)"><input type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)} className={inputClass} /></Field>
    </ModalShell>
  );
}

const BUTTONS = [
  { key: "followup", label: "Follow-up", icon: CalendarClock },
  { key: "meeting", label: "Meeting", icon: CalendarDays },
  { key: "note", label: "Note", icon: StickyNote },
  { key: "call", label: "Call", icon: Phone },
  { key: "email", label: "Email", icon: Mail },
  { key: "activity", label: "Activity", icon: Sparkles },
];

export default function ActivityComposer({ lead, canManageFollowups, canManageNotes }) {
  const router = useRouter();
  const [open, setOpen] = useState(null); // "followup" | "meeting" | "note" | "call" | "email" | "activity" | null

  function onSaved() {
    setOpen(null);
    router.refresh();
    refreshSidebarBadges();
  }

  function click(key) {
    if (key === "call") { if (lead.phone) window.open(`tel:${lead.phone}`, "_self"); if (canManageFollowups) setOpen("call"); return; }
    if (key === "email") { if (lead.email) window.open(`mailto:${lead.email}`, "_self"); if (canManageFollowups) setOpen("email"); return; }
    setOpen(key);
  }

  if (!canManageFollowups && !canManageNotes) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 mb-6">
      <p className="text-muted-foreground text-xs mb-2.5">What would you like to do?</p>
      <div className="flex flex-wrap gap-2">
        {BUTTONS.map((b) => {
          if ((b.key === "note" && !canManageNotes) || (b.key !== "note" && !canManageFollowups)) return null;
          const Icon = b.icon;
          return (
            <button key={b.key} onClick={() => click(b.key)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm hover:border-indigo-500/40 hover:bg-indigo-500/5 transition cursor-pointer">
              <Icon className="h-4 w-4" /> {b.label}
            </button>
          );
        })}
      </div>

      {open === "followup" && <FollowupModal leadId={lead.id} onClose={() => setOpen(null)} onSaved={onSaved} />}
      {open === "meeting" && <MeetingModal leadId={lead.id} onClose={() => setOpen(null)} onSaved={onSaved} />}
      {open === "note" && <NoteModal leadId={lead.id} onClose={() => setOpen(null)} onSaved={onSaved} />}
      {open === "call" && <QuickLogModal leadId={lead.id} activityType="Phone Call" onClose={() => setOpen(null)} onSaved={onSaved} />}
      {open === "email" && <QuickLogModal leadId={lead.id} activityType="Email" onClose={() => setOpen(null)} onSaved={onSaved} />}
      {open === "activity" && <QuickLogModal leadId={lead.id} activityType="Custom" onClose={() => setOpen(null)} onSaved={onSaved} />}
    </div>
  );
}
