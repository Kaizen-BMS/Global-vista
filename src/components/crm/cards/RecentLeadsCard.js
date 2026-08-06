const STATUS_COLORS = {
  New: "text-blue-400",
  Open: "text-cyan-400",
  Assigned: "text-indigo-400",
  Hold: "text-yellow-400",
  Denied: "text-red-400",
  Converted: "text-green-400",
};

export default function RecentLeadsCard({ leads }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-4">Recent Leads</p>
      <div className="space-y-3">
        {leads.length === 0 && <p className="text-neutral-500 text-sm">No leads yet.</p>}
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-white">{lead.name}</p>
              <p className="text-neutral-500 text-xs">{lead.source_name} · {lead.service_name}</p>
            </div>
            <span className={`text-xs font-medium ${STATUS_COLORS[lead.status]}`}>{lead.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}