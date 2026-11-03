"use client";
import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

/** Shown before Mark Complete / Move to Next Stage / Move Back — a note is
 * never required, but always offered, so there's a record of WHY a
 * student moved (or didn't) rather than a silent stage change. Confirming
 * with an empty note still goes ahead with the stage change itself. */
export default function StageNoteModal({ title, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try { await onConfirm(note.trim()); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
      <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground font-medium">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <label className="block text-xs text-muted-foreground mb-1.5">Note (optional)</label>
        <textarea
          autoFocus rows={4} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note about this, if you'd like…"
          className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {title}
          </button>
        </div>
      </form>
      </ModalFocusTrap>
    </div>
  );
}
