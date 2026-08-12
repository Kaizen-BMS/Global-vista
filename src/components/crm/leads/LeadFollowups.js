"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2, CalendarClock, XCircle, Mail, MailWarning, BellRing } from "lucide-react";
import { FOLLOWUP_TYPES, DISPOSITION_COLORS } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import FollowupCompleteModal from "@/components/crm/leads/FollowupCompleteModal";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

// Reads confirmation_sent_at/reminder_sent_at/*_email_error optimistically —
// they're undefined until the pending lead_followups migration runs, which
// renders as "not sent yet" rather than crashing or lying about status.
function EmailStatus({ followup }) {
  if (followup.status !== "Scheduled" && followup.status !== "Completed") return null;
  const items = [];
  if (followup.confirmation_email_error) items.push({ icon: MailWarning, text: `Confirmation not sent — ${followup.confirmation_email_error}`, color: "text-amber-400" });
  else if (followup.confirmation_sent_at) items.push({ icon: Mail, text: "Confirmation sent", color: "text-emerald-400" });

  if (followup.status === "Scheduled") {
    if (followup.reminder_sent_at) items.push({ icon: BellRing, text: "Reminder sent", color: "text-emerald-400" });
    else if (followup.reminder_email_error) items.push({ icon: MailWarning, text: `Reminder failed — ${followup.reminder_email_error}`, color: "text-amber-400" });
    else if (followup.confirmation_sent_at) items.push({ icon: BellRing, text: "Reminder scheduled (24h before)", color: "text-muted-foreground" });
  }
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-1.5">
      {items.map((it, i) => (
        <span key={i} className={`flex items-center gap-1 text-[10px] ${it.color}`}><it.icon className="h-3 w-3" />{it.text}</span>
      ))}
    </div>
  );
}

export default function LeadFollowups({ leadId, followups, canManage }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [type, setType] = useState(FOLLOWUP_TYPES[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingFollowup, setCompletingFollowup] = useState(null);
  const [reschedulingId, setReschedulingId] = useState(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [busyId, setBusyId] = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!scheduledAt) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, scheduledAt }),
      });
      if (!res.ok) throw new Error();
      toast.success("Follow-up scheduled. Confirmation email will be sent if the lead has a valid email address.");
      setScheduledAt("");
      router.refresh();
    } catch {
      toast.error("Failed to schedule follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function handleComplete(details) {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", followupId: completingFollowup.id, ...details }),
      });
      if (!res.ok) throw new Error();
      toast.success("Follow-up completed.");
      setCompletingFollowup(null);
      router.refresh();
    } catch {
      toast.error("Failed to update follow-up.");
    }
  }

  async function submitReschedule(followupId) {
    if (!rescheduleValue) return;
    setBusyId(followupId);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", followupId, scheduledAt: rescheduleValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to reschedule.");
      toast.success("Follow-up rescheduled. The lead will be emailed the new time.");
      setReschedulingId(null); setRescheduleValue("");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusyId(null); }
  }

  async function cancelFollowup(followupId) {
    if (!confirm("Cancel this follow-up? The lead will be emailed that it's cancelled.")) return;
    setBusyId(followupId);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/followups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", followupId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to cancel.");
      toast.success("Follow-up cancelled.");
      router.refresh();
    } catch (err) { toast.error(err.message); } finally { setBusyId(null); }
  }

  return (
    <div>
      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-6">
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer">
            {FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm"
          />
          <button
            type="submit"
            disabled={saving}
            className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Schedule
          </button>
        </form>
      )}

      <div className="space-y-3">
        {followups.length === 0 && <p className="text-muted-foreground text-sm">No follow-ups yet.</p>}
        {followups.map((f) => (
          <div key={f.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-foreground text-sm">{f.type} — <span className="text-muted-foreground">{f.status}</span></p>
                  {f.disposition && <span className={`text-[10px] px-2 py-0.5 rounded-md border ${DISPOSITION_COLORS[f.disposition] || ""}`}>{f.disposition}</span>}
                  {f.duration_seconds ? <span className="text-muted-foreground text-xs">{Math.round(f.duration_seconds / 60)} min</span> : null}
                </div>
                <p className="text-muted-foreground text-xs mt-0.5">{formatDateTime(f.scheduled_at, timezone)}</p>
                {f.outcome && <p className="text-muted-foreground text-xs mt-1">Outcome: {f.outcome}</p>}
                <EmailStatus followup={f} />
              </div>
              {f.status === "Scheduled" && canManage && (
                <div className="flex items-center gap-3 shrink-0">
                  <button onClick={() => setCompletingFollowup(f)} className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 cursor-pointer transition">
                    <CheckCircle2 className="h-4 w-4" /> Complete
                  </button>
                  <button onClick={() => { setReschedulingId(reschedulingId === f.id ? null : f.id); setRescheduleValue(""); }} className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer transition">
                    <CalendarClock className="h-4 w-4" /> Reschedule
                  </button>
                  <button onClick={() => cancelFollowup(f.id)} disabled={busyId === f.id} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 cursor-pointer transition disabled:opacity-60">
                    <XCircle className="h-4 w-4" /> Cancel
                  </button>
                </div>
              )}
            </div>
            {reschedulingId === f.id && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <input
                  type="datetime-local"
                  value={rescheduleValue}
                  onChange={(e) => setRescheduleValue(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-muted border border-border text-foreground text-xs"
                />
                <button onClick={() => submitReschedule(f.id)} disabled={!rescheduleValue || busyId === f.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium cursor-pointer disabled:opacity-50 transition">
                  {busyId === f.id && <Loader2 className="h-3 w-3 animate-spin" />} Confirm New Time
                </button>
                <button onClick={() => setReschedulingId(null)} className="text-muted-foreground hover:text-foreground text-xs cursor-pointer">Cancel</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {completingFollowup && (
        <FollowupCompleteModal
          followupType={completingFollowup.type}
          onClose={() => setCompletingFollowup(null)}
          onSubmit={handleComplete}
        />
      )}
    </div>
  );
}
