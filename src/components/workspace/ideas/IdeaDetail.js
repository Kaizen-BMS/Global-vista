"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Paperclip, Send, Globe2, Lock } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { refreshSidebarBadges } from "@/components/layout/Sidebar";

export default function IdeaDetail({ initialIdea, isSuperAdmin, statuses, assignees, currentUserId }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [idea, setIdea] = useState(initialIdea);
  const [comment, setComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [savingField, setSavingField] = useState(null);
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [pendingRejection, setPendingRejection] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  async function refresh() {
    const res = await apiFetch(`/api/ideas/${idea.id}`);
    if (res.ok) setIdea((await res.json()).idea);
    refreshSidebarBadges();
    router.refresh();
  }

  async function postComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await apiFetch(`/api/ideas/${idea.id}/comments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setComment("");
      toast.success("Comment posted.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to post comment."); }
    finally { setPosting(false); }
  }

  async function updateField(body, fieldKey) {
    setSavingField(fieldKey);
    try {
      const res = await apiFetch(`/api/ideas/${idea.id}/status`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Updated.");
      await refresh();
    } catch (err) { toast.error(err.message || "Failed to update."); }
    finally { setSavingField(null); }
  }

  function handleStatusChange(newStatus) {
    if (newStatus === "Rejected") { setPendingRejection(true); return; }
    updateField({ status: newStatus }, "status");
  }

  async function confirmRejection() {
    if (!rejectionReason.trim()) { toast.error("A rejection reason is required."); return; }
    await updateField({ status: "Rejected", rejectionReason }, "status");
    setPendingRejection(false);
    setRejectionReason("");
  }

  async function viewAttachment() {
    if (attachmentUrl) { window.open(attachmentUrl, "_blank"); return; }
    const res = await apiFetch(`/api/ideas/${idea.id}/attachment`);
    if (!res.ok) { toast.error("Could not load attachment."); return; }
    const data = await res.json();
    setAttachmentUrl(data.url);
    window.open(data.url, "_blank");
  }

  const comments = idea.comments || [];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href="/workspace/ideas" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm cursor-pointer transition"><ArrowLeft className="h-4 w-4" /> Back to Ideas</Link>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-foreground text-lg font-semibold">{idea.title}</p>
            <p className="text-muted-foreground text-xs mt-1">
              #{idea.id} · {idea.category} · Submitted by {idea.created_by_name || "—"} · {formatDateTime(idea.created_at, timezone)}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-muted-foreground text-xs shrink-0">
            {idea.visibility === "company" ? <><Globe2 className="h-3.5 w-3.5" /> Company-wide</> : <><Lock className="h-3.5 w-3.5" /> Private</>}
          </span>
        </div>

        <p className="text-foreground text-sm whitespace-pre-wrap mb-3">{idea.description}</p>
        {idea.status === "Rejected" && idea.rejection_reason && (
          <p className="text-muted-foreground text-xs mb-3"><span className="font-medium text-foreground">Rejection reason: </span>{idea.rejection_reason}</p>
        )}
        {idea.attachment_name && (
          <button onClick={viewAttachment} className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 text-xs cursor-pointer mt-1">
            <Paperclip className="h-3.5 w-3.5" /> {idea.attachment_name}
          </button>
        )}
      </div>

      {isSuperAdmin ? (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Status</label>
              <select disabled={savingField === "status"} value={idea.status} onChange={(e) => handleStatusChange(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Priority</label>
              <select disabled={savingField === "priority"} value={idea.priority} onChange={(e) => updateField({ priority: e.target.value }, "priority")} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
                {["Low", "Medium", "High"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Responsible</label>
              <select disabled={savingField === "assignedTo"} value={idea.assigned_to || ""} onChange={(e) => updateField({ assignedTo: e.target.value ? Number(e.target.value) : null }, "assignedTo")} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm cursor-pointer disabled:opacity-60">
                <option value="">Unassigned</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>

          {pendingRejection && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
              <label className="block text-xs text-muted-foreground mb-1.5">Reason for rejection (required, shown to the employee)</label>
              <textarea rows={2} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-2" />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setPendingRejection(false); setRejectionReason(""); }} className="px-3 py-1.5 rounded-lg bg-card border border-border text-foreground text-xs cursor-pointer">Cancel</button>
                <button onClick={confirmRejection} disabled={savingField === "status"} className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium cursor-pointer disabled:opacity-60">Confirm rejection</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <p className="text-muted-foreground text-xs">Status</p>
          <p className="text-foreground text-sm font-medium">{idea.status}{idea.assigned_to_name ? ` · owned by ${idea.assigned_to_name}` : ""}</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-foreground text-sm font-medium mb-3">Discussion</p>
        <div className="space-y-3 mb-4">
          {comments.length === 0 && <p className="text-muted-foreground text-xs">No comments yet.</p>}
          {comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-xs font-medium">{c.author_name || "—"}</p>
                <p className="text-muted-foreground text-[11px]">{formatDateTime(c.created_at, timezone)}</p>
              </div>
              <p className="text-foreground text-sm whitespace-pre-wrap">{c.comment}</p>
            </div>
          ))}
        </div>

        <form onSubmit={postComment} className="space-y-2">
          <textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm" />
          <div className="flex justify-end">
            <button type="submit" disabled={posting || !comment.trim()} className="btn-brand flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Comment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
