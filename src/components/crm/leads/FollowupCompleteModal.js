"use client";
import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { FOLLOWUP_DISPOSITIONS } from "@/lib/modules/crm/constants/leadStages";

export default function FollowupCompleteModal({ followupType, onClose, onSubmit }) {
  const [outcome, setOutcome] = useState("");
  const [disposition, setDisposition] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [nextFollowUp, setNextFollowUp] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        outcome: outcome || "Completed",
        disposition: disposition || null,
        durationSeconds: durationMinutes ? Number(durationMinutes) * 60 : null,
        nextFollowUp: nextFollowUp || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={onClose} />
      <form onSubmit={handleSubmit} className="relative w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-150">
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-medium">Complete {followupType ? `— ${followupType}` : "Follow-up"}</p>
          <button type="button" onClick={onClose} className="text-neutral-500 hover:text-white cursor-pointer"><X className="h-4 w-4" /></button>
        </div>

        <label className="block text-xs text-neutral-500 mb-1.5">Outcome / notes</label>
        <textarea
          autoFocus rows={3} value={outcome} onChange={(e) => setOutcome(e.target.value)}
          placeholder="What happened?"
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Disposition</label>
            <select value={disposition} onChange={(e) => setDisposition(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
              <option value="">Not set</option>
              {FOLLOWUP_DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(followupType === "Phone Call" || followupType === "Zoom" || followupType === "Meeting") && (
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5">Duration (minutes)</label>
              <input type="number" min="0" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm" />
            </div>
          )}
        </div>

        <label className="block text-xs text-neutral-500 mb-1.5">Next follow-up (optional)</label>
        <input
          type="datetime-local" value={nextFollowUp} onChange={(e) => setNextFollowUp(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm mb-5"
        />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-sm cursor-pointer">Cancel</button>
          <button type="submit" disabled={saving} className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60 cursor-pointer">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </button>
        </div>
      </form>
    </div>
  );
}
