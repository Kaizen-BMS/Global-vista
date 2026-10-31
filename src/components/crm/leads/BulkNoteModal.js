"use client";
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

/** Multi-select "counselling" — adds the SAME note to every selected
 * student at once, same timestamp (now) for all of them. Mirrors
 * FollowupCompleteModal's shape (ModalFocusTrap + role="dialog" form). */
export default function BulkNoteModal({ count, singularLower, pluralLower, onClose, onSubmit }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    try { await onSubmit(content.trim()); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label="Add note to selected" className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">Add note to {count} {count === 1 ? singularLower : pluralLower}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Note</label>
        <textarea
          autoFocus required rows={4} value={content} onChange={(e) => setContent(e.target.value)}
          placeholder="e.g. Called all of them, all interested — following up next week"
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving || !content.trim()} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </form>
      </ModalFocusTrap>
    </div>
  );
}
