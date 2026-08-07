"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";
import { FOLLOWUP_TYPES, DISPOSITION_COLORS } from "@/lib/modules/crm/constants/leadStages";
import { apiFetch } from "@/components/shared/apiClient";
import FollowupCompleteModal from "@/components/crm/leads/FollowupCompleteModal";

export default function LeadFollowups({ leadId, followups, canManage }) {
  const router = useRouter();
  const [type, setType] = useState(FOLLOWUP_TYPES[0]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [completingFollowup, setCompletingFollowup] = useState(null);

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
      toast.success("Follow-up scheduled.");
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

  return (
    <div>
      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap gap-2 mb-6">
          <select value={type} onChange={(e) => setType(e.target.value)} className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm cursor-pointer">
            {FOLLOWUP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="px-3 py-2 rounded-lg bg-neutral-800 border border-neutral-700 text-white text-sm"
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
        {followups.length === 0 && <p className="text-neutral-500 text-sm">No follow-ups yet.</p>}
        {followups.map((f) => (
          <div key={f.id} className="flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-lg p-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-white text-sm">{f.type} — <span className="text-neutral-400">{f.status}</span></p>
                {f.disposition && <span className={`text-[10px] px-2 py-0.5 rounded-md border ${DISPOSITION_COLORS[f.disposition] || ""}`}>{f.disposition}</span>}
                {f.duration_seconds ? <span className="text-neutral-600 text-xs">{Math.round(f.duration_seconds / 60)} min</span> : null}
              </div>
              <p className="text-neutral-500 text-xs mt-0.5">{new Date(f.scheduled_at).toLocaleString()}</p>
              {f.outcome && <p className="text-neutral-400 text-xs mt-1">Outcome: {f.outcome}</p>}
            </div>
            {f.status === "Scheduled" && canManage && (
              <button
                onClick={() => setCompletingFollowup(f)}
                className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 cursor-pointer transition"
              >
                <CheckCircle2 className="h-4 w-4" />
                Complete
              </button>
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
