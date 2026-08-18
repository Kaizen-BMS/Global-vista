"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, Send, Lock } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

const PRIORITY_ACCENT = { Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400" };

export default function ComplaintDetail({ initialComplaint, isSuperAdmin, statuses, reviewers, currentUserId }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [complaint, setComplaint] = useState(initialComplaint);
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState(null);

  async function refresh() {
    const res = await apiFetch(`/api/complaints/${complaint.id}`);
    if (res.ok) setComplaint((await res.json()).complaint);
    refreshSidebarBadges();
    router.refresh();
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch(`/api/complaints/${complaint.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment, isInternal: internal }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setComment(""); setInternal(false);
      toast.success("Reply posted.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to post reply."); }
    finally { setPosting(false); }
  }

  async function updateField(field, value) {
    setSavingField(field);
    try {
      const key = field === "assignedReviewerId" ? "assignedReviewerId" : field;
      const res = await apiFetch(`/api/complaints/${complaint.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Updated.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to update."); }
    finally { setSavingField(null); }
  }

  async function viewAttachment() {
    if (attachmentUrl) { window.open(attachmentUrl, "_blank"); return; }
    const res = await apiFetch(`/api/complaints/${complaint.id}/attachment`);
    if (!res.ok) { toast.error("Could not load attachment."); return; }
    const data = await res.json();
    setAttachmentUrl(data.url);
    window.open(data.url, "_blank");
  }

  const visibleComments = complaint.comments || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/workspace/complaints" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back to Complaints</Link>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-foreground text-lg font-semibold">{complaint.subject}</p>
            <p className="text-muted-foreground text-xs mt-1">
              #{complaint.id} · {complaint.category} · Raised by {complaint.created_by_name || "—"} · {formatDateTime(complaint.created_at, timezone)}
            </p>
          </div>
          <span className={`text-xs font-semibold shrink-0 ${PRIORITY_ACCENT[complaint.priority]}`}>{complaint.priority} priority</span>
        </div>

        <p className="text-foreground text-sm whitespace-pre-wrap mb-3">{complaint.description}</p>
        {complaint.desired_resolution && (
          <p className="text-muted-foreground text-xs mb-3"><span className="font-medium text-foreground">Desired resolution: </span>{complaint.desired_resolution}</p>
        )}
        {complaint.related_lead_name && <p className="text-muted-foreground text-xs mb-1">Related lead: {complaint.related_lead_name}</p>}
        {complaint.related_employee_name && <p className="text-muted-foreground text-xs mb-1">Related employee: {complaint.related_employee_name}</p>}
        {complaint.attachment_name && (
          <button onClick={viewAttachment} className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs cursor-pointer mt-1">
            <Paperclip className="h-3.5 w-3.5" /> {complaint.attachment_name}
          </button>
        )}
      </div>

      {isSuperAdmin ? (
        <div className="bg-card border border-border rounded-xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
            <select disabled={savingField === "status"} value={complaint.status} onChange={(e) => updateField("status", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
              {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Priority</label>
            <select disabled={savingField === "priority"} value={complaint.priority} onChange={(e) => updateField("priority", e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
              {["Low", "Medium", "High", "Urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1.5">Reviewer</label>
            <select disabled={savingField === "assignedReviewerId"} value={complaint.assigned_reviewer_id || ""} onChange={(e) => updateField("assignedReviewerId", e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
              <option value="">Unassigned</option>
              {reviewers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <p className="text-muted-foreground text-xs">Status</p>
          <p className="text-foreground text-sm font-medium">{complaint.status}{complaint.reviewer_name ? ` · reviewed by ${complaint.reviewer_name}` : ""}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground text-sm font-medium mb-3">Conversation</p>
        <div className="space-y-3 mb-4">
          {visibleComments.length === 0 && <p className="text-muted-foreground text-xs">No replies yet.</p>}
          {visibleComments.map((c) => (
            <div key={c.id} className={`rounded-lg border p-3 ${c.is_internal ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-muted/40"}`}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-xs font-medium">{c.author_name || "—"}{c.is_internal && <span className="ml-1.5 inline-flex items-center gap-1 text-amber-400 text-[10px]"><Lock className="h-3 w-3" />Internal</span>}</p>
                <p className="text-muted-foreground text-[11px]">{formatDateTime(c.created_at, timezone)}</p>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={postComment} className="space-y-2">
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a reply…" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
          <div className="flex items-center justify-between">
            {isSuperAdmin ? (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} /> Internal note (not visible to employee)
              </label>
            ) : <span />}
            <button type="submit" disabled={posting || !comment.trim()} className="btn-brand flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Reply
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
