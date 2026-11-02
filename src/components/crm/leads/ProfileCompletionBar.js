/** Schools-only — replaces the sales-CRM Lead Score with something that
 * actually matters for a student record: are the required fields filled
 * in. `completion` comes from getLeadProfileCompletion (leadFieldLayout.js). */
export default function ProfileCompletionBar({ completion }) {
  if (!completion || completion.total === 0) return null;
  const { percent, filled, total, missingLabels } = completion;
  const complete = percent === 100;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 mb-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-foreground text-sm font-medium">Profile Completion</p>
        <p className={`text-sm font-semibold tabular-nums ${complete ? "text-emerald-400" : "text-amber-400"}`}>{percent}%</p>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full transition-all ${complete ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${percent}%` }} />
      </div>
      {!complete && (
        <p className="text-muted-foreground text-xs mt-2">
          {total - filled} field{total - filled === 1 ? "" : "s"} missing — {missingLabels.join(", ")}
        </p>
      )}
    </div>
  );
}
