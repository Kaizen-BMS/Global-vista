"use client";
import { useState, useEffect } from "react";
import { X, Loader2, Mail } from "lucide-react";
import ModalFocusTrap from "@/components/shared/ModalFocusTrap";

/**
 * "Select several students, send them all the same email" — e.g. to share
 * a meeting link or a common update. Same ModalFocusTrap + Escape-to-close
 * shape as NotesPopover/BulkPreviewEditModal.
 */
export default function BulkEmailModal({ count, singularLower, pluralLower, onClose, onSubmit }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || sending) return;
    setSending(true);
    try { await onSubmit(subject.trim(), message.trim()); } finally { setSending(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <ModalFocusTrap>
        <form onSubmit={handleSubmit} role="dialog" aria-modal="true" aria-label={`Email ${count} selected ${count === 1 ? singularLower : pluralLower}`} className="relative w-full max-w-md bg-background border border-border rounded-xl shadow-2xl animate-in zoom-in-95 fade-in duration-150">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-foreground font-medium flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Email {count} {count === 1 ? singularLower : pluralLower}</p>
            <button type="button" onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="h-4 w-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-3">
            <input
              autoFocus value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
              placeholder="Message — e.g. a counselling update or a meeting link"
              className="w-full px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-muted-foreground text-xs">Only sent to students who have an email address on file.</p>
          </div>

          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm cursor-pointer">Cancel</button>
            <button type="submit" disabled={sending || !subject.trim() || !message.trim()} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
              {sending && <Loader2 className="h-4 w-4 animate-spin" />} Send
            </button>
          </div>
        </form>
      </ModalFocusTrap>
    </div>
  );
}
