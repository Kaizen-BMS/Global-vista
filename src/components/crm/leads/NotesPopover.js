"use client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { X, Loader2, StickyNote } from "lucide-react";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

/**
 * A fast, table-launched popup for viewing/adding one student's notes —
 * deliberately separate from LeadPreviewDrawer (which stays focused on
 * contact actions + priority + stage history). Reuses the existing
 * /api/leads/[id]/notes route unchanged.
 */
export default function NotesPopover({ leadId, leadName, canManageNotes, onClose }) {
  const timezone = useTimezone();
  const [notes, setNotes] = useState(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiFetch(`/api/leads/${leadId}/notes`).then((r) => r.json()).then((d) => { if (!cancelled) setNotes(d.notes || []); });
    return () => { cancelled = true; };
  }, [leadId]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function addNote(e) {
    e.preventDefault();
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/notes`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: content.trim() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to add note.");
      setContent("");
      const r = await apiFetch(`/api/leads/${leadId}/notes`);
      const d = await r.json();
      setNotes(d.notes || []);
      toast.success("Note added.");
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
        <div role="dialog" aria-modal="true" aria-label={`Notes for ${leadName}`} className="relative w-full max-w-md max-h-[80vh] flex flex-col bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <p className="text-foreground font-medium flex items-center gap-2"><StickyNote className="h-4 w-4 text-muted-foreground" /> Notes — {leadName}</p>
            <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {notes === null ? (
              <div className="flex justify-center py-8"><Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /></div>
            ) : notes.length === 0 ? (
              <p className="text-muted-foreground text-xs text-center py-8">No notes yet.</p>
            ) : notes.map((n) => (
              <div key={n.id} className="bg-card border border-border rounded-lg p-3">
                <p className="text-foreground text-sm whitespace-pre-wrap">{n.content}</p>
                <p className="text-muted-foreground text-[11px] mt-1.5">{n.author_name || "System"} · {formatDateTime(n.created_at, timezone)}</p>
              </div>
            ))}
          </div>

          {canManageNotes && (
            <form onSubmit={addNote} className="border-t border-border p-4 flex items-end gap-2 shrink-0">
              <textarea
                rows={2} value={content} onChange={(e) => setContent(e.target.value)}
                placeholder="Add a note..."
                className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <button type="submit" disabled={saving || !content.trim()} className="btn-brand px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer shrink-0">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
              </button>
            </form>
          )}
        </div>
      </ModalFocusTrap>
    </div>
  );
}
