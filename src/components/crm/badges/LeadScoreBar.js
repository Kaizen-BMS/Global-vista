const SEGMENTS = [
  { key: "stageScore", max: 40, label: "Pipeline stage", color: "bg-indigo-500" },
  { key: "engagementScore", max: 30, label: "Engagement (notes/tasks/follow-ups)", color: "bg-emerald-500" },
  { key: "recencyScore", max: 30, label: "Recency", color: "bg-amber-500" },
];

export default function LeadScoreBar({ score }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-muted-foreground text-xs">Lead Score <span className="text-muted-foreground">(computed, not stored)</span></p>
        <p className="text-foreground text-sm font-semibold">{score.total} / 100</p>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden bg-muted">
        {SEGMENTS.map((s) => (
          <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${(score[s.key] / 100) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {SEGMENTS.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={`h-1.5 w-1.5 rounded-full ${s.color}`} />
            {s.label}: {score[s.key]}/{s.max}
          </div>
        ))}
      </div>
    </div>
  );
}
