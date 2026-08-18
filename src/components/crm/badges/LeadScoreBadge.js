"use client";
import { useState, useRef, useEffect } from "react";

const BAND_COLORS = {
  Hot: "bg-red-500/10 text-red-400 border-red-500/30",
  Warm: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Cold: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};
const SEGMENTS = [
  { key: "stageScore", max: 40, label: "Pipeline stage", color: "bg-indigo-500" },
  { key: "engagementScore", max: 30, label: "Engagement (notes/tasks/follow-ups)", color: "bg-emerald-500" },
  { key: "recencyScore", max: 30, label: "Recency", color: "bg-amber-500" },
];

/** Compact chip in the header, with the full stage/engagement/recency
 * breakdown available on click rather than permanently occupying header
 * space as a full-width bar. */
export default function LeadScoreBadge({ score }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`px-2 py-1 rounded-full text-xs border font-medium cursor-pointer transition hover:brightness-110 ${BAND_COLORS[score.band]}`}
        title="Computed from pipeline stage, engagement, and recency — not a stored field. Click for breakdown."
      >
        {score.band} · {score.total}
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-64 bg-card border border-border rounded-xl shadow-2xl p-3.5 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-[11px]">Lead Score <span className="text-muted-foreground">(computed, not stored)</span></p>
            <p className="text-foreground text-xs font-semibold">{score.total} / 100</p>
          </div>
          <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
            {SEGMENTS.map((s) => (
              <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${score[s.key]}%` }} />
            ))}
          </div>
          <div className="flex flex-col gap-1 mt-2.5">
            {SEGMENTS.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.color}`} />
                {s.label}: {score[s.key]}/{s.max}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
