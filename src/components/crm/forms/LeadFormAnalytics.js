import Link from "next/link";
import { formatDateTime } from "@/lib/helpers/dateFormat";

function StatCard({ label, value, color = "text-foreground" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="text-muted-foreground text-xs mt-0.5">{label}</p>
    </div>
  );
}

function BreakdownCard({ title, rows, labelKey }) {
  const total = rows.reduce((sum, r) => sum + r.count, 0) || 1;
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">{title}</p>
      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Not enough data yet.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r[labelKey]}>
              <div className="flex items-center justify-between text-xs mb-1"><span className="text-foreground">{r[labelKey] || "Unknown"}</span><span className="text-muted-foreground">{r.count}</span></div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(r.count / total) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadFormAnalytics({ analytics, timezone = "UTC" }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Views" value={analytics.views} />
        <StatCard label="QR Scans" value={analytics.scans} color="text-gold" />
        <StatCard label="Submissions" value={analytics.submissions} color="text-emerald-400" />
        <StatCard label="Conversion" value={`${analytics.conversionRate}%`} color="text-indigo-400" />
        <StatCard label="Avg. Completion" value={analytics.avgCompletionSeconds ? `${analytics.avgCompletionSeconds}s` : "—"} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <BreakdownCard title="Top Devices" rows={analytics.topDevices} labelKey="device" />
        <BreakdownCard title="Top Countries" rows={analytics.topCountries} labelKey="country" />
        <BreakdownCard title="Top Browsers" rows={analytics.topBrowsers} labelKey="browser" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <p className="text-foreground font-medium px-5 py-4 border-b border-border">Recent Submissions</p>
        {analytics.recentSubmissions.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No submissions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {analytics.recentSubmissions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  {s.lead_id ? (
                    <Link href={`/workspace/lead-management/${s.lead_id}`} className="text-foreground text-sm hover:text-indigo-400 cursor-pointer">{s.lead_name}</Link>
                  ) : (
                    <span className="text-muted-foreground text-sm">{s.status === "spam" ? "Blocked (spam)" : "Failed submission"}</span>
                  )}
                  <p className="text-muted-foreground text-xs mt-0.5">{s.device} · {s.browser} · {s.country || "Unknown"}</p>
                </div>
                <span className="text-muted-foreground text-xs shrink-0">{formatDateTime(s.created_at, timezone)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
