export default function RecentActivityCard({ logs }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Recent Activity</p>
      <div className="space-y-3">{logs.length === 0 && <p className="text-neutral-500 text-sm">No activity yet.</p>}{logs.map((l) => <div key={l.id} className="flex items-start justify-between text-sm"><div><span className="text-indigo-400">{l.user_name || "System"}</span> <span className="text-neutral-300">{l.description}</span></div><span className="text-neutral-600 text-xs shrink-0 ml-3">{new Date(l.created_at).toLocaleTimeString()}</span></div>)}</div>
    </div>
  );
}