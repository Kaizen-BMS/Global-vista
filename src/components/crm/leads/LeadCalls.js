"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, Loader2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const NON_TERMINAL = ["initiated", "ringing", "in-progress"];

const STATUS_STYLE = {
  initiated: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  ringing: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  "in-progress": "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  "no-answer": "bg-amber-500/10 text-amber-400 border-amber-500/30",
  busy: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  failed: "bg-red-500/10 text-red-400 border-red-500/30",
  canceled: "bg-muted text-muted-foreground border-border",
};

function StatusBadge({ status }) {
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-md border ${STATUS_STYLE[status] || STATUS_STYLE.canceled}`}>{status}</span>;
}

function formatDuration(seconds) {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60), s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function LeadCalls({ leadId, initialCalls, canMakeCalls, canViewCalls, callingConfigured, callingHasCredentials }) {
  const router = useRouter();
  const timezone = useTimezone();
  const [calls, setCalls] = useState(initialCalls);
  const [calling, setCalling] = useState(false);
  const pollRef = useRef(null);

  async function refresh() {
    try {
      const res = await apiFetch(`/api/leads/${leadId}/calls`);
      if (!res.ok) return;
      const data = await res.json();
      setCalls(data.calls);
    } catch { /* silent — next poll or manual action will catch up */ }
  }

  // While any call is still in flight, poll for the webhook-driven status
  // update (ringing → in-progress → completed + recording) instead of
  // making the owner manually refresh the page to see it land.
  useEffect(() => {
    const hasPending = calls.some((c) => NON_TERMINAL.includes(c.status));
    if (!hasPending) return;
    pollRef.current = setInterval(refresh, 4000);
    const stopAfter = setTimeout(() => clearInterval(pollRef.current), 120000);
    return () => { clearInterval(pollRef.current); clearTimeout(stopAfter); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls]);

  async function placeCall() {
    setCalling(true);
    try {
      const res = await apiFetch(`/api/leads/${leadId}/calls`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to place call.");
      toast.success("Calling your phone now — once you answer, you'll be connected to the lead.");
      router.refresh();
      refresh();
    } catch (err) { toast.error(err.message); } finally { setCalling(false); }
  }

  if (!canViewCalls) return null;

  return (
    <div>
      {canMakeCalls && (
        callingConfigured ? (
          <button onClick={placeCall} disabled={calling} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium disabled:opacity-60 cursor-pointer transition mb-4">
            {calling ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-3.5 w-3.5" />} Call &amp; Record
          </button>
        ) : (
          <p className="text-muted-foreground text-xs bg-muted border border-border rounded-lg p-3 mb-4">
            {callingHasCredentials
              ? "Calling has been turned off by your company owner."
              : "Calling isn't connected yet. Ask your company owner to set it up under Organizational Setting → Calling Integration."}
          </p>
        )
      )}

      {calls.length === 0 ? (
        <p className="text-muted-foreground text-sm">No calls logged yet.</p>
      ) : (
        <div className="space-y-2">
          {calls.map((c) => (
            <div key={c.id} className="bg-muted/50 border border-border rounded-lg p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-foreground truncate">{c.employee_name || "Unknown"}</p>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-muted-foreground text-[11px] mt-0.5">
                {formatDateTime(c.created_at, timezone)}
                {c.duration_seconds != null && ` · ${formatDuration(c.duration_seconds)}`}
              </p>
              {c.recording_url ? (
                <audio controls preload="none" src={c.recording_url} className="w-full h-8 mt-2" />
              ) : NON_TERMINAL.includes(c.status) ? (
                <p className="text-muted-foreground text-[11px] mt-1.5 italic">Call in progress…</p>
              ) : c.status === "completed" ? (
                <p className="text-muted-foreground text-[11px] mt-1.5 italic">Recording processing — check back shortly.</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
