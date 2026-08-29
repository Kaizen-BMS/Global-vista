"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, UserCog } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const PRIORITY_ACCENT = { Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400" };
const STATUSES = ["Open", "In Progress", "Waiting for Company", "Resolved", "Closed"];

export default function SupportTicketDetail({ initialTicket, currentUserId }) {
  const timezone = useTimezone();
  const [ticket, setTicket] = useState(initialTicket);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [savingField, setSavingField] = useState(null);

  async function refresh() {
    const res = await apiFetch(`/api/platform/support-tickets/${ticket.id}`);
    if (res.ok) setTicket((await res.json()).ticket);
  }

  async function updateField(field, value) {
    setSavingField(field);
    try {
      const res = await apiFetch(`/api/platform/support-tickets/${ticket.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Updated.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to update."); }
    finally { setSavingField(null); }
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch(`/api/platform/support-tickets/${ticket.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setComment("");
      toast.success("Reply sent.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to send reply."); }
    finally { setPosting(false); }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/platform/support" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back to Support Tickets</Link>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-foreground text-lg font-semibold">{ticket.subject}</p>
            <p className="text-muted-foreground text-xs mt-1">
              #{ticket.id} · {ticket.category} · {ticket.company_name} · Raised by {ticket.created_by_name || "—"}{ticket.created_by_email ? ` (${ticket.created_by_email})` : ""} · {formatDateTime(ticket.created_at, timezone)}
            </p>
          </div>
          <span className={`text-xs font-semibold shrink-0 ${PRIORITY_ACCENT[ticket.priority]}`}>{ticket.priority} priority</span>
        </div>
        <p className="text-foreground text-sm whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
          <select disabled={savingField === "status"} value={ticket.status} onChange={(e) => updateField("status", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Priority</label>
          <select disabled={savingField === "priority"} value={ticket.priority} onChange={(e) => updateField("priority", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
            {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1.5">Handled by</label>
          {ticket.assigned_operator_id === currentUserId ? (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm"><UserCog className="h-3.5 w-3.5 text-indigo-400" /> You</div>
          ) : ticket.operator_name ? (
            <div className="px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm truncate">{ticket.operator_name}</div>
          ) : (
            <button disabled={savingField === "assignToSelf"} onClick={() => updateField("assignToSelf", true)} className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-sm cursor-pointer disabled:opacity-60">
              {savingField === "assignToSelf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCog className="h-3.5 w-3.5" />} Assign to me
            </button>
          )}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground text-sm font-medium mb-3">Conversation</p>
        <div className="space-y-3 mb-4">
          {(!ticket.comments || ticket.comments.length === 0) && <p className="text-muted-foreground text-xs">No replies yet.</p>}
          {ticket.comments?.map((c) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.is_operator ? "border-indigo-500/30 bg-indigo-500/5" : "border-border bg-muted/40"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-xs font-medium">{c.author_name || "—"}{c.is_operator && <span className="ml-1.5 text-indigo-400 text-[10px]">Platform Team</span>}</p>
                <p className="text-muted-foreground text-[11px]">{formatDateTime(c.created_at, timezone)}</p>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={postComment} className="space-y-2">
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Reply to the company…" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
          <div className="flex justify-end">
            <button type="submit" disabled={posting || !comment.trim()} className="btn-brand flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
