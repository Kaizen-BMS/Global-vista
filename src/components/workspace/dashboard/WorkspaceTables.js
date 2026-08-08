import Link from "next/link";
import { Plus, Pencil, Trash2, UserPlus, CheckCircle2, LogIn, Activity, AlertTriangle, Clock, UploadCloud } from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/helpers/dateFormat";

function actionIcon(action = "") {
  if (action.includes("create") || action.includes("provision")) return { Icon: Plus, color: "text-emerald-400" };
  if (action.includes("delete")) return { Icon: Trash2, color: "text-red-400" };
  if (action.includes("assign")) return { Icon: UserPlus, color: "text-blue-400" };
  if (action.includes("complete")) return { Icon: CheckCircle2, color: "text-green-400" };
  if (action.includes("login")) return { Icon: LogIn, color: "text-cyan-400" };
  if (action.includes("update") || action.includes("change")) return { Icon: Pencil, color: "text-amber-400" };
  return { Icon: Activity, color: "text-muted-foreground" };
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
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">{title}</p>
      {empty ? <p className="text-muted-foreground text-sm text-center py-6">{emptyLabel || "No data yet"}</p> : children}
    </div>
  );
}

export function RecentLeadsTable({ leads }) {
  return (
    <TableCard title="Recent Leads" empty={!leads.length}>
      <div className="divide-y divide-border">
        {leads.map((l) => (
          <Link key={l.id} href={`/workspace/lead-management/${l.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition">
            <div className="min-w-0">
              <p className="text-foreground text-sm truncate">{l.name}</p>
              <p className="text-muted-foreground text-xs">{l.source_name} · {l.service_name}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[11px] border shrink-0 ml-2 ${STATUS_COLORS[l.status] || "bg-muted/20 text-muted-foreground border-border/30"}`}>{l.status}</span>
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function TeamPerformanceTable({ team }) {
  return (
    <TableCard title="Team Performance" empty={!team.length} emptyLabel="No assigned leads yet.">
      <div className="divide-y divide-border">
        {team.map((t) => {
          const rate = t.total_leads > 0 ? Math.round((t.converted / t.total_leads) * 100) : 0;
          return (
            <div key={t.id} className="py-2.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-foreground text-sm">{t.name}</p>
                <p className="text-muted-foreground text-xs">{t.converted}/{t.total_leads} converted</p>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${rate}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </TableCard>
  );
}

export function RecentActivityTable({ logs, timezone }) {
  return (
    <TableCard title="Recent Activity" empty={!logs.length}>
      <div className="divide-y divide-border">
        {logs.map((l) => {
          const { Icon, color } = actionIcon(l.action);
          return (
            <div key={l.id} className="flex items-center gap-2.5 py-2.5 hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors">
              <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
              <p className="text-foreground text-sm truncate flex-1">{l.description || `${l.action} — ${l.module}`}</p>
              <span className="text-muted-foreground text-xs shrink-0 ml-2">{formatDateTime(l.created_at, timezone)}</span>
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
      <div className="divide-y divide-border">
        {people.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2.5">
            <p className="text-foreground text-sm">{p.name}</p>
            <span className="text-muted-foreground text-xs">{p.days_until === 0 ? "Today" : `in ${p.days_until}d`}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentLoginsTable({ logins, timezone }) {
  return (
    <TableCard title="Recent Logins" empty={!logins.length}>
      <div className="divide-y divide-border">
        {logins.map((l) => (
          <div key={l.id} className="flex items-center justify-between py-2.5">
            <p className="text-foreground text-sm">{l.name}</p>
            <span className="text-muted-foreground text-xs">{formatDateTime(l.created_at, timezone)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function MissingDocumentsTable({ employees }) {
  return (
    <TableCard title="Employees with Missing Documents" empty={!employees.length} emptyLabel="Everyone is up to date.">
      <div className="divide-y divide-border">
        {employees.map((e) => (
          <Link key={e.id} href={`/workspace/users/${e.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition">
            <p className="text-foreground text-sm truncate">{e.name}</p>
            <span className="flex items-center gap-1 text-red-400 text-xs shrink-0 ml-2"><AlertTriangle className="h-3 w-3" />{e.missing_count} missing</span>
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function PendingApprovalDocumentsTable({ documents }) {
  return (
    <TableCard title="Documents Pending Approval" empty={!documents.length} emptyLabel="Nothing awaiting review.">
      <div className="divide-y divide-border">
        {documents.map((d) => (
          <Link key={d.id} href={`/workspace/users/${d.user_id || ""}`} className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition">
            <div className="min-w-0">
              <p className="text-foreground text-sm truncate">{d.employee_name}</p>
              <p className="text-muted-foreground text-xs truncate">{d.type_name}</p>
            </div>
            <span className="flex items-center gap-1 text-amber-400 text-xs shrink-0 ml-2"><Clock className="h-3 w-3" /> Pending</span>
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function ExpiringDocumentsTable({ documents, timezone }) {
  return (
    <TableCard title="Expiring Documents" empty={!documents.length} emptyLabel="Nothing expiring in the next 30 days.">
      <div className="divide-y divide-border">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="text-foreground text-sm truncate">{d.employee_name}</p>
              <p className="text-muted-foreground text-xs truncate">{d.type_name}</p>
            </div>
            <span className="text-red-400 text-xs shrink-0 ml-2">{formatDate(d.expiry_date, timezone)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentlyUploadedDocumentsTable({ documents, timezone }) {
  return (
    <TableCard title="Recently Uploaded Documents" empty={!documents.length}>
      <div className="divide-y divide-border">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center gap-2.5 py-2.5">
            <UploadCloud className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-foreground text-sm truncate">{d.employee_name} · {d.type_name}</p>
            </div>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">{formatDateTime(d.created_at, timezone)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}
