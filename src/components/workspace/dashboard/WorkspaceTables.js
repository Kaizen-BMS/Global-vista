import Link from "next/link";
import { Plus, Pencil, Trash2, UserPlus, CheckCircle2, LogIn, Activity } from "lucide-react";

function fmtDateTime(d) { return d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"; }

function actionIcon(action = "") {
  if (action.includes("create") || action.includes("provision")) return { Icon: Plus, color: "text-emerald-400" };
  if (action.includes("delete")) return { Icon: Trash2, color: "text-red-400" };
  if (action.includes("assign")) return { Icon: UserPlus, color: "text-blue-400" };
  if (action.includes("complete")) return { Icon: CheckCircle2, color: "text-green-400" };
  if (action.includes("login")) return { Icon: LogIn, color: "text-cyan-400" };
  if (action.includes("update") || action.includes("change")) return { Icon: Pencil, color: "text-amber-400" };
  return { Icon: Activity, color: "text-neutral-500" };
}

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Open: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  Assigned: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  Converted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  Lost: "bg-red-500/10 text-red-400 border-red-500/30",
};

function TableCard({ title, children, empty, emptyLabel }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-3">{title}</p>
      {empty ? <p className="text-neutral-600 text-sm text-center py-6">{emptyLabel || "No data yet"}</p> : children}
    </div>
  );
}

export function RecentLeadsTable({ leads }) {
  return (
    <TableCard title="Recent Leads" empty={!leads.length}>
      <div className="divide-y divide-neutral-800">
        {leads.map((l) => (
          <Link key={l.id} href={`/workspace/lead-management/${l.id}`} className="flex items-center justify-between py-2.5 hover:bg-neutral-800/40 -mx-2 px-2 rounded-lg transition">
            <div className="min-w-0">
              <p className="text-neutral-200 text-sm truncate">{l.name}</p>
              <p className="text-neutral-600 text-xs">{l.source_name} · {l.service_name}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] border shrink-0 ml-2 ${STATUS_COLORS[l.status] || "bg-neutral-700/20 text-neutral-400 border-neutral-600/30"}`}>{l.status}</span>
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function TeamPerformanceTable({ team }) {
  return (
    <TableCard title="Team Performance" empty={!team.length} emptyLabel="No assigned leads yet.">
      <div className="divide-y divide-neutral-800">
        {team.map((t) => {
          const rate = t.total_leads > 0 ? Math.round((t.converted / t.total_leads) * 100) : 0;
          return (
            <div key={t.id} className="py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-neutral-200 text-sm">{t.name}</p>
                <p className="text-neutral-500 text-xs">{t.converted}/{t.total_leads} converted</p>
              </div>
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </TableCard>
  );
}

export function RecentActivityTable({ logs }) {
  return (
    <TableCard title="Recent Activity" empty={!logs.length}>
      <div className="divide-y divide-neutral-800">
        {logs.map((l) => {
          const { Icon, color } = actionIcon(l.action);
          return (
            <div key={l.id} className="flex items-center gap-2.5 py-2.5 hover:bg-neutral-800/30 -mx-2 px-2 rounded-lg transition-colors">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <p className="text-neutral-300 text-sm truncate flex-1">{l.description || `${l.action} — ${l.module}`}</p>
              <span className="text-neutral-600 text-xs shrink-0 ml-2">{fmtDateTime(l.created_at)}</span>
            </div>
          );
        })}
      </div>
    </TableCard>
  );
}

export function UpcomingAnniversariesTable({ people }) {
  return (
    <TableCard title="Upcoming Work Anniversaries" empty={!people.length} emptyLabel="None in the next 30 days.">
      <div className="divide-y divide-neutral-800">
        {people.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2.5">
            <p className="text-neutral-200 text-sm">{p.name}</p>
            <span className="text-neutral-500 text-xs">{p.days_until === 0 ? "Today" : `in ${p.days_until}d`}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentLoginsTable({ logins }) {
  return (
    <TableCard title="Recent Logins" empty={!logins.length}>
      <div className="divide-y divide-neutral-800">
        {logins.map((l) => (
          <div key={l.id} className="flex items-center justify-between py-2.5">
            <p className="text-neutral-200 text-sm">{l.name}</p>
            <span className="text-neutral-600 text-xs">{fmtDateTime(l.created_at)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}
