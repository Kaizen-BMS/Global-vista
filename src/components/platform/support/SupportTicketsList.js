"use client";
import { useState } from "react";
import Link from "next/link";
import { MessageSquareWarning, Clock, AlertTriangle, Timer, CheckCircle2 } from "lucide-react";
import { apiFetch } from "@/components/shared/apiClient";
import EmptyState from "@/components/shared/EmptyState";
import { useTimezone } from "@/components/shared/TimezoneProvider";
import { formatDateTime } from "@/lib/helpers/dateFormat";

const STATUS_ACCENT = {
  "Open": "border-sky-500/30 bg-sky-500/5 text-sky-400",
  "In Progress": "border-indigo-500/30 bg-indigo-500/5 text-indigo-400",
  "Waiting for Company": "border-violet-500/30 bg-violet-500/5 text-violet-400",
  "Resolved": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "Closed": "border-border bg-muted text-muted-foreground",
};
const PRIORITY_ACCENT = { Low: "text-muted-foreground", Medium: "text-sky-400", High: "text-amber-400", Urgent: "text-red-400" };
const STATUS_TABS = ["All", "Open", "In Progress", "Waiting for Company", "Resolved", "Closed"];

function StatTile({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs mb-1">{label}</p>
        <p className="text-foreground text-xl font-semibold tabular-nums">{value}</p>
      </div>
      <div className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${accent}`}><Icon className="h-4.5 w-4.5" /></div>
    </div>
  );
}

export default function SupportTicketsList({ initialTickets, initialStats }) {
  const timezone = useTimezone();
  const [tickets, setTickets] = useState(initialTickets);
  const [tab, setTab] = useState("All");
  const [loading, setLoading] = useState(false);

  async function changeTab(status) {
    setTab(status);
    setLoading(true);
    try {
      const res = await apiFetch(`/api/platform/support-tickets${status === "All" ? "" : `?status=${encodeURIComponent(status)}`}`);
      if (res.ok) setTickets((await res.json()).tickets);
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatTile label="Total" value={initialStats.total} icon={MessageSquareWarning} accent="text-indigo-400 bg-indigo-500/10" />
        <StatTile label="Open" value={initialStats.open} icon={Clock} accent="text-sky-400 bg-sky-500/10" />
        <StatTile label="High Priority" value={initialStats.highPriority} icon={AlertTriangle} accent="text-amber-400 bg-amber-500/10" />
        <StatTile label="In Progress" value={initialStats.inProgress} icon={Timer} accent="text-violet-400 bg-violet-500/10" />
        <StatTile label="Resolved" value={initialStats.resolved} icon={CheckCircle2} accent="text-emerald-400 bg-emerald-500/10" />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button key={s} onClick={() => changeTab(s)} disabled={loading} className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap cursor-pointer transition disabled:opacity-60 ${tab === s ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30" : "text-muted-foreground border border-transparent hover:bg-muted"}`}>
            {s}
          </button>
        ))}
      </div>

      {tickets.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="No tickets here" description={tab === "All" ? "No company has raised a support ticket yet." : `No tickets with status "${tab}".`} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tickets.map((t) => (
            <Link key={t.id} href={`/platform/support/${t.id}`} className={`rounded-xl border p-4 transition hover:-translate-y-0.5 cursor-pointer block ${STATUS_ACCENT[t.status] || "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-foreground text-sm font-medium truncate">{t.subject}</p>
                <span className={`text-[10px] font-semibold shrink-0 ${PRIORITY_ACCENT[t.priority]}`}>{t.priority}</span>
              </div>
              <p className="text-muted-foreground text-xs mb-1">{t.company_name}</p>
              <p className="text-muted-foreground text-xs mb-3">#{t.id} · {t.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium">{t.status}</span>
                <span className="text-muted-foreground text-[11px]">{formatDateTime(t.created_at, timezone)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
