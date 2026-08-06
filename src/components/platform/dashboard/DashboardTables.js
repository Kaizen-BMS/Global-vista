import Link from "next/link";

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"; }
function fmtDateTime(d) { return d ? new Date(d).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"; }

const STATUS_COLORS = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  trial: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  expired: "bg-red-500/10 text-red-400 border-red-500/30",
  cancelled: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
  suspended: "bg-red-500/10 text-red-400 border-red-500/30",
  deleted: "bg-neutral-700/20 text-neutral-400 border-neutral-600/30",
};

function Badge({ status }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] border capitalize ${STATUS_COLORS[status] || "bg-neutral-700/20 text-neutral-400 border-neutral-600/30"}`}>{status}</span>;
}

function TableCard({ title, children, empty, emptyLabel }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-medium mb-3">{title}</p>
      {empty ? <p className="text-neutral-600 text-sm text-center py-6">{emptyLabel || "No data yet"}</p> : children}
    </div>
  );
}

export function RecentCompaniesTable({ companies }) {
  return (
    <TableCard title="Recent Companies" empty={!companies.length}>
      <div className="divide-y divide-neutral-800">
        {companies.map((c) => (
          <Link key={c.id} href={`/platform/companies/${c.id}`} className="flex items-center justify-between py-2.5 hover:bg-neutral-800/40 -mx-2 px-2 rounded-lg transition">
            <div className="min-w-0">
              <p className="text-neutral-200 text-sm truncate">{c.name}</p>
              <p className="text-neutral-600 text-xs">{c.country || "—"} · {fmtDate(c.created_at)}</p>
            </div>
            <Badge status={c.status} />
          </Link>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentSubscriptionsTable({ subscriptions }) {
  return (
    <TableCard title="Latest Subscriptions" empty={!subscriptions.length}>
      <div className="divide-y divide-neutral-800">
        {subscriptions.map((s) => (
          <div key={s.id} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <p className="text-neutral-200 text-sm truncate">{s.company_name}</p>
              <p className="text-neutral-600 text-xs">{s.plan_name} · {fmtDate(s.starts_at)}{s.ends_at ? ` – ${fmtDate(s.ends_at)}` : ""}</p>
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

export function LatestErrorsTable({ errors }) {
  return (
    <TableCard title="Latest Errors" empty={!errors.length} emptyLabel="No provisioning errors — everything healthy.">
      <div className="divide-y divide-neutral-800">
        {errors.map((e) => (
          <div key={e.id} className="py-2.5">
            <div className="flex items-center justify-between">
              <p className="text-neutral-200 text-sm">{e.company_name} — {e.step}</p>
              <span className="text-neutral-600 text-xs shrink-0 ml-2">{fmtDateTime(e.created_at)}</span>
            </div>
            {e.detail && <p className="text-red-400/80 text-xs mt-0.5 truncate">{e.detail}</p>}
          </div>
        ))}
      </div>
    </TableCard>
  );
}

export function RecentPlatformEventsTable({ events }) {
  return (
    <TableCard title="Recent Notifications" empty={!events.length} emptyLabel="No platform events recorded yet.">
      <div className="divide-y divide-neutral-800">
        {events.map((e) => (
          <div key={e.id} className="flex items-center justify-between py-2.5">
            <p className="text-neutral-300 text-sm">{e.event_name.replace(/[._]/g, " ")} — {e.company_name}</p>
            <span className="text-neutral-600 text-xs shrink-0 ml-2">{fmtDateTime(e.created_at)}</span>
          </div>
        ))}
      </div>
    </TableCard>
  );
}
