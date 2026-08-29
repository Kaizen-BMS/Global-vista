"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Send, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const PRIORITY_ACCENT = { Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400" };

export default function PlatformSupportTicketDetail({ initialTicket }) {
  const timezone = useTimezone();
  const [ticket, setTicket] = useState(initialTicket);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);

  async function refresh() {
    const res = await apiFetch(`/api/support-tickets/${ticket.id}`);
    if (res.ok) setTicket((await res.json()).ticket);
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch(`/api/support-tickets/${ticket.id}/comments`, {
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
      <Link href="/workspace/platform-support" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back to Platform Support</Link>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-foreground text-lg font-semibold">{ticket.subject}</p>
            <p className="text-muted-foreground text-xs mt-1">#{ticket.id} · {ticket.category} · Raised by {ticket.created_by_name || "—"} · {formatDateTime(ticket.created_at, timezone)}</p>
          </div>
          <span className={`text-xs font-semibold shrink-0 ${PRIORITY_ACCENT[ticket.priority]}`}>{ticket.priority} priority</span>
        </div>
        <p className="text-foreground text-sm whitespace-pre-wrap">{ticket.description}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
        <p className="text-muted-foreground text-xs">Status</p>
        <p className="text-foreground text-sm font-medium">{ticket.status}{ticket.operator_name ? ` · handled by ${ticket.operator_name}` : ""}</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground text-sm font-medium mb-3">Conversation</p>
        <div className="space-y-3 mb-4">
          {(!ticket.comments || ticket.comments.length === 0) && <p className="text-muted-foreground text-xs">No replies yet.</p>}
          {ticket.comments?.map((c) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.is_operator ? "border-indigo-500/30 bg-indigo-500/5" : "border-border bg-muted/40"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-xs font-medium flex items-center gap-1.5">
                  {c.is_operator ? <span className="inline-flex items-center gap-1 text-indigo-400"><ShieldCheck className="h-3 w-3" />Platform Team</span> : (c.author_name || "—")}
                </p>
                <p className="text-muted-foreground text-[11px]">{formatDateTime(c.created_at, timezone)}</p>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={postComment} className="space-y-2">
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a reply…" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
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
