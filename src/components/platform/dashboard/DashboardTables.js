import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/helpers/dateFormat";

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  trial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/10 text-red-400 border-red-500/30",
  cancelled: "bg-muted/20 text-muted-foreground border-border/30",
  suspended: "bg-red-500/10 text-red-400 border-red-500/30",
  deleted: "bg-muted/20 text-muted-foreground border-border/30",
};

function Badge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] border capitalize ${STATUS_COLORS[status] || "bg-muted/20 text-muted-foreground border-border/30"}`}>{status}</span>;
}

function TableCard({ title, children, empty, emptyLabel }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">{title}</p>
      {empty ? <p className="text-muted-foreground text-sm text-center py-6">{emptyLabel || "No data yet"}</p> : children}
    </div>
  );
}

export function RecentCompaniesTable({ companies, timezone }) {
  return (
    <TableCard title="Recent Companies" empty={!companies.length}>
      <div className="divide-y divide-border">
        {companies.map((c) => (
          <Link key={c.id} href={`/platform/companies/${c.id}`} className="flex items-center justify-between py-2.5 hover:bg-muted/40 -mx-2 px-2 rounded-lg transition">
            <div className="min-w-0">
              <p className="text-foreground text-sm truncate">{c.name}</p>
              <p className="text-muted-foreground text-xs">{c.country || "—"} · {formatDate(c.created_at, timezone)}</p>
            </div>
            <Badge status={c.status} />
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentSubscriptionsTable({ subscriptions, timezone }) {
  return (
    <TableCard title="Latest Subscriptions" empty={!subscriptions.length}>
      <div className="divide-y divide-border">
        {subscriptions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="text-foreground text-sm truncate">{s.company_name}</p>
              <p className="text-muted-foreground text-xs">{s.plan_name} · {formatDate(s.starts_at, timezone)}{s.ends_at ? ` – ${formatDate(s.ends_at, timezone)}` : ""}</p>
            </div>
            <Badge status={s.status} />
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function LatestPaymentsTable() {
  return <TableCard title="Latest Payments" empty emptyLabel="Billing is not implemented yet — no payment records exist." />;
}

export function LatestErrorsTable({ errors, timezone }) {
  return (
    <TableCard title="Latest Errors" empty={!errors.length} emptyLabel="No provisioning errors — everything healthy.">
      <div className="divide-y divide-border">
        {errors.map((e) => (
          <div key={e.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-foreground text-sm">{e.company_name} — {e.step}</p>
              <span className="text-muted-foreground text-xs shrink-0 ml-2">{formatDateTime(e.created_at, timezone)}</span>
            </div>
            {e.detail && <p className="text-red-400/80 text-xs mt-0.5 truncate">{e.detail}</p>}
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentPlatformEventsTable({ events, timezone }) {
  return (
    <TableCard title="Recent Notifications" empty={!events.length} emptyLabel="No platform events recorded yet.">
      <div className="divide-y divide-border">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2.5">
            <p className="text-foreground text-sm">{e.event_name.replace(/[._]/g, " ")} — {e.company_name}</p>
            <span className="text-muted-foreground text-xs shrink-0 ml-2">{formatDateTime(e.created_at, timezone)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}
