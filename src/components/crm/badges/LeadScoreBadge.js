const BAND_COLORS = {
  Hot: "bg-red-500/10 text-red-400 border-red-500/30",
  Warm: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  Cold: "bg-sky-500/10 text-sky-400 border-sky-500/30",
};

export default function LeadScoreBadge({ score }) {
  return (
    <span
      className={`px-2 py-1 rounded-full text-xs border font-medium ${BAND_COLORS[score.band]}`}
      title="Computed from pipeline stage, engagement, and recency — not a stored field."
    >
      {score.band} · {score.total}
    </span>
  );
}
