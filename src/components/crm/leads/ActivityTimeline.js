"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Plus, Pencil, ArrowRightLeft, Tag, UserPlus, UserCheck, UserMinus, StickyNote,
  CalendarClock, CalendarDays, CheckCircle2, XCircle, ListChecks, RotateCcw, GitMerge, Trash2,
  Users, FileUp, FileX, SlidersHorizontal, Wallet, CircleDollarSign, Undo2, Receipt, FormInput,
  ChevronDown, ChevronRight, Search, Loader2,
} from "lucide-react";
import { TIMELINE_ACTION_META, TIMELINE_FILTERS } from "@/lib/modules/crm/constants/timelineActions";
import { DISPOSITION_COLORS } from "@/lib/modules/crm/constants/leadStages";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { dayLabel, formatTime, formatDateTime } from "@/lib/helpers/dateFormat";
import { formatBytes } from "@/lib/helpers/formatBytes";
import { apiFetch } from "@/components/shared/apiClient";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";
import FollowupCompleteModal from "@/components/crm/leads/FollowupCompleteModal";

const ICONS = {
  Clock, Plus, Pencil, ArrowRightLeft, Tag, UserPlus, UserCheck, UserMinus, StickyNote,
  CalendarClock, CalendarDays, CheckCircle2, XCircle, ListChecks, RotateCcw, GitMerge, Trash2,
  Users, FileUp, FileX, SlidersHorizontal, Wallet, CircleDollarSign, Undo2, Receipt, FormInput,
};

function Row({ label, value }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 text-xs py-1">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-foreground text-right">{value}</span>
    </div>
  );
}

function FollowupDetail({ item, leadId, canManage, timezone, onChanged }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [completing, setCompleting] = useState(false);

  async function call(body, successMsg) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed.");
      toast.success(successMsg);
      onChanged();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (!item) return <p className="text-muted-foreground text-xs">This follow-up's record could not be found (it may have been part of a bulk action).</p>;
  return (
    <div>
      <Row label="Type" value={item.type} />
      <Row label="Scheduled" value={formatDateTime(item.scheduled_at, timezone)} />
      <Row label="Status" value={item.status} />
      <Row label="Created by" value={item.created_by_name} />
      {item.disposition && <Row label="Disposition" value={<span className={`px-1.5 py-0.5 rounded-md border text-[10px] ${DISPOSITION_COLORS[item.disposition] || ""}`}>{item.disposition}</span>} />}
      {item.duration_seconds ? <Row label="Duration" value={`${Math.round(item.duration_seconds / 60)} min`} /> : null}
      {item.notes && <Row label="Notes" value={item.notes} />}
      {item.outcome && <Row label="Outcome" value={item.outcome} />}
      {item.next_follow_up && <Row label="Next follow-up" value={formatDateTime(item.next_follow_up, timezone)} />}

      {item.status === "Scheduled" && canManage && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <button onClick={() => setCompleting(true)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 cursor-pointer"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>
          <button onClick={() => setRescheduling((s) => !s)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"><CalendarClock className="h-3.5 w-3.5" /> Reschedule</button>
          <button onClick={() => call({ action: "cancel", followupId: item.id }, "Follow-up cancelled.")} disabled={busy} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-60"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
        </div>
      )}
      {rescheduling && (
        <div className="flex items-center gap-2 mt-2">
          <input type="datetime-local" value={rescheduleValue} onChange={(e) => setRescheduleValue(e.target.value)} className="px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
          <button
            onClick={() => call({ action: "reschedule", followupId: item.id, scheduledAt: rescheduleValue }, "Follow-up rescheduled.")}
            disabled={!rescheduleValue || busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Confirm
          </button>
        </div>
      )}
      {completing && (
        <FollowupCompleteModal
          followupType={item.type}
          onClose={() => setCompleting(false)}
          onSubmit={async (details) => { await call({ action: "complete", followupId: item.id, ...details }, "Follow-up completed."); setCompleting(false); }}
        />
      )}
    </div>
  );
}

function MeetingDetail({ item, leadId, canManage, timezone, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  async function call(body, successMsg) {
    setBusy(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/meetings`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Action failed.");
      toast.success(successMsg);
      onChanged();
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  }

  if (!item) return <p className="text-muted-foreground text-xs">This meeting's record could not be found.</p>;
  return (
    <div>
      <Row label="Title" value={item.title} />
      <Row label="Type" value={item.meeting_type} />
      <Row label="Starts" value={formatDateTime(item.starts_at, timezone)} />
      <Row label="Ends" value={formatDateTime(item.ends_at, timezone)} />
      <Row label="Status" value={item.status} />
      <Row label="Created by" value={item.created_by_name} />
      {item.location_or_url && <Row label="Location / URL" value={item.location_or_url} />}
      {item.participants && <Row label="Participants" value={item.participants} />}
      {item.notes && <Row label="Notes" value={item.notes} />}
      {item.outcome && <Row label="Outcome" value={item.outcome} />}

      {item.status === "Scheduled" && canManage && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-3">
          <button onClick={() => call({ action: "complete", meetingId: item.id }, "Meeting marked complete.")} disabled={busy} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 cursor-pointer disabled:opacity-60"><CheckCircle2 className="h-3.5 w-3.5" /> Complete</button>
          <button onClick={() => setRescheduling((s) => !s)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"><CalendarDays className="h-3.5 w-3.5" /> Reschedule</button>
          <button onClick={() => call({ action: "cancel", meetingId: item.id }, "Meeting cancelled.")} disabled={busy} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer disabled:opacity-60"><XCircle className="h-3.5 w-3.5" /> Cancel</button>
        </div>
      )}
      {rescheduling && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
          <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="px-2 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs" />
          <button
            onClick={() => call({ action: "reschedule", meetingId: item.id, startsAt, endsAt }, "Meeting rescheduled.")}
            disabled={!startsAt || !endsAt || busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />} Confirm
          </button>
        </div>
      )}
    </div>
  );
}

function NoteDetail({ item, leadId, canManageNotes, timezone, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item?.content || "");
  const [saving, setSaving] = useState(false);

  if (!item) return null;

  async function save() {
    if (!content.trim()) { toast.error("Note content is required."); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/notes`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: item.id, content: content.trim(), visibility: item.visibility, isPinned: !!item.is_pinned }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update note.");
      toast.success("Note updated.");
      setEditing(false);
      onChanged();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div>
      <Row label="Type" value={item.type} />
      <Row label="Visibility" value={item.visibility} />
      {editing ? (
        <div className="mt-2">
          <textarea
            value={content} onChange={(e) => setContent(e.target.value)} rows={4} autoFocus
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-3 mt-2">
            <button onClick={save} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50">
              {saving && <Loader2 className="h-3 w-3 animate-spin" />} Save
            </button>
            <button onClick={() => { setEditing(false); setContent(item.content); }} className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">Cancel</button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-foreground text-sm whitespace-pre-wrap mt-2">{item.content}</p>
          {item.updated_at && (
            <p className="text-muted-foreground text-[11px] mt-2 italic">Edited by {item.editor_name || "someone"} on {formatDateTime(item.updated_at, timezone)}</p>
          )}
          {canManageNotes && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer mt-2">
              <Pencil className="h-3 w-3" /> Edit
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DocumentDetail({ item, timezone }) {
  if (!item) return null;
  return (
    <div>
      <Row label="File" value={item.file_name} />
      <Row label="Type" value={item.document_type_name || item.type} />
      <Row label="Size" value={formatBytes(item.file_size)} />
      <Row label="Uploaded by" value={item.uploaded_by_name} />
      <Row label="Uploaded" value={formatDateTime(item.created_at, timezone)} />
    </div>
  );
}

function PaymentDetail({ item, meta }) {
  return (
    <div>
      <Row label="Amount" value={meta?.amount != null ? `${meta.amount}` : null} />
      <Row label="Method" value={meta?.method} />
    </div>
  );
}

function EventCard({ event, index, leadId, timezone, canManageFollowups, canManageNotes, lookup, onChanged, expanded, onToggle }) {
  const meta = TIMELINE_ACTION_META[event.action] || { label: event.action, icon: "Clock", color: "bg-muted" };
  const Icon = ICONS[meta.icon] || Clock;
  const isOpen = expanded.has(event.id);

  let detail = null;
  if (meta.detailSource && event.meta?.[meta.idKey]) {
    const item = lookup[meta.detailSource]?.get(String(event.meta[meta.idKey]));
    if (meta.detailSource === "followups") detail = <FollowupDetail item={item} leadId={leadId} canManage={canManageFollowups} timezone={timezone} onChanged={onChanged} />;
    else if (meta.detailSource === "meetings") detail = <MeetingDetail item={item} leadId={leadId} canManage={canManageFollowups} timezone={timezone} onChanged={onChanged} />;
    else if (meta.detailSource === "notes") detail = <NoteDetail item={item} leadId={leadId} canManageNotes={canManageNotes} timezone={timezone} onChanged={onChanged} />;
    else if (meta.detailSource === "documents") detail = <DocumentDetail item={item} timezone={timezone} />;
    else if (meta.detailSource === "payments") detail = <PaymentDetail item={item} meta={event.meta} />;
  }

  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index, 8) * 0.03 }} className="relative">
      <div className={`absolute -left-6 top-0.5 h-4 w-4 rounded-full ${meta.color} ring-4 ring-background flex items-center justify-center`}>
        <Icon className="h-2.5 w-2.5 text-white" />
      </div>
      <button onClick={() => onToggle(event.id)} className="w-full text-left cursor-pointer group">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-foreground">
              <span className="font-medium">{meta.label}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              <span className="text-indigo-400">{event.user_name || "System"}</span> · {event.description}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="text-xs">{formatTime(event.created_at, timezone)}</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""} group-hover:text-foreground`} />
          </div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-2 mb-1 bg-muted/40 border border-border rounded-lg p-3">
              {detail || <p className="text-muted-foreground text-xs">Created {formatDateTime(event.created_at, timezone)}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ActivityTimeline({ leadId, events, followups = [], meetings = [], notes = [], documents = [], canManageFollowups, canManageNotes }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());

  function toggleGroup(label) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }

  const lookup = useMemo(() => ({
    followups: new Map(followups.map((f) => [String(f.id), f])),
    meetings: new Map(meetings.map((m) => [String(m.id), m])),
    notes: new Map(notes.map((n) => [String(n.id), n])),
    documents: new Map(documents.map((d) => [String(d.id), d])),
  }), [followups, meetings, notes, documents]);

  function onToggle(id) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function onChanged() {
    router.refresh();
    refreshSidebarBadges();
  }

  const activeFilter = TIMELINE_FILTERS.find((f) => f.key === filter);
  const filtered = useMemo(() => {
    let list = events;
    if (activeFilter?.actions) list = list.filter((e) => activeFilter.actions.includes(e.action));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((e) => (e.description || "").toLowerCase().includes(q) || (e.user_name || "").toLowerCase().includes(q));
    }
    return list;
  }, [events, activeFilter, search]);

  const groups = [];
  for (const event of filtered) {
    const label = dayLabel(event.created_at, timezone);
    let group = groups.find((g) => g.label === label);
    if (!group) { group = { label, events: [] }; groups.push(group); }
    group.events.push(event);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search activity…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-5">
        {TIMELINE_FILTERS.map((f) => (
          <button
            key={f.key} onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-full text-xs border cursor-pointer transition ${filter === f.key ? "bg-indigo-500/15 border-indigo-500/40 text-indigo-300" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">No activity {filter !== "all" ? "of this type " : ""}yet.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => {
            const isGroupOpen = !collapsedGroups.has(group.label);
            return (
              <div key={group.label}>
                <button onClick={() => toggleGroup(group.label)} className="flex items-center gap-1.5 mb-3 cursor-pointer group/header">
                  {isGroupOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover/header:text-foreground">{group.label}</p>
                  <span className="text-[10px] text-muted-foreground">({group.events.length})</span>
                </button>
                <AnimatePresence initial={false}>
                  {isGroupOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="relative pl-6">
                        <div className="absolute left-2 top-0 bottom-0 w-px bg-muted" />
                        <div className="space-y-5 pb-1">
                          {group.events.map((event, i) => (
                            <EventCard
                              key={event.id} event={event} index={i} leadId={leadId} timezone={timezone}
                              canManageFollowups={canManageFollowups} canManageNotes={canManageNotes}
                              lookup={lookup} onChanged={onChanged} expanded={expanded} onToggle={onToggle}
                            />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
