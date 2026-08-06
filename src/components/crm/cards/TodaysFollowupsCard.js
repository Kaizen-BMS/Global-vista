export default function TodaysFollowupsCard({ followups }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Today's Follow Ups</p>
      <div className="space-y-3">
        {followups.length === 0 && <p className="text-neutral-500 text-sm">Nothing scheduled today.</p>}
        {followups.map((f) => (
          <div key={f.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-white">{f.lead_name}</p>
              <p className="text-neutral-500 text-xs">{f.type} · {f.lead_phone}</p>
            </div>
            <span className="text-neutral-400 text-xs">
              {new Date(f.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}