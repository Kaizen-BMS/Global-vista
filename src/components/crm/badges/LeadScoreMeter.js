const SEGMENTS = [
  { key: "stageScore", max: 40, label: "Pipeline stage", color: "bg-indigo-500" },
  { key: "engagementScore", max: 30, label: "Engagement", color: "bg-emerald-500" },
  { key: "recencyScore", max: 30, label: "Recency", color: "bg-amber-500" },
];

/** The compact sidebar counterpart to the header's LeadScoreBadge chip —
 * always-visible breakdown, but sized to sit quietly in the sidebar rather
 * than dominate the page the way the old full-width header bar did. */
export default function LeadScoreMeter({ score }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-foreground font-medium text-sm">Lead Score</p>
        <p className="text-foreground text-sm font-semibold tabular-nums">{score.total}<span className="text-muted-foreground font-normal"> / 100</span></p>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {SEGMENTS.map((s) => (
          <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${score[s.key]}%` }} />
        ))}
      </div>
      <div className="flex flex-col gap-1 mt-2.5">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className={`h-1.5 w-1.5 rounded-full shrink-0 ${s.color}`} />{s.label}</span>
            <span>{score[s.key]}/{s.max}</span>
          </div>
        ))}
      </div>
      <p className="text-muted-foreground/70 text-[10px] mt-2.5">Computed from pipeline stage, engagement, and recency — not a stored field.</p>
    </div>
  );
}
