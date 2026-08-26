import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getStorageUsage, getLargestFiles, getStorageByEmployee, getStorageByLead, formatBytes } from "@/lib/actions/storage";
import { getSettingsByGroup } from "@/lib/actions/settings";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import ForbiddenState from "@/components/shared/ForbiddenState";
import { HardDrive } from "lucide-react";

function Panel({ title, children, empty, emptyLabel }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-foreground font-medium mb-3">{title}</p>
      {empty ? <p className="text-muted-foreground text-sm text-center py-6">{emptyLabel || "No data yet."}</p> : children}
    </div>
  );
}

export default async function StorageReportPage() {
  const session = await getSession();
  if (!(await can(session, "employee_documents.manage"))) return <ForbiddenState />;
  if (!(await isModuleEnabledForCompany(session.company_id, "reports"))) {
    return <ForbiddenState message="Reports isn't included in your company's current plan. Contact the platform team to enable it." />;
  }

  const [usage, largestFiles, byEmployee, byLead, systemSettings] = await Promise.all([
    getStorageUsage(session), getLargestFiles(session, 15), getStorageByEmployee(session, 10), getStorageByLead(session, 10),
    getSettingsByGroup(session, "system"),
  ]);
  const timezone = systemSettings.timezone || "UTC";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2"><HardDrive className="h-5 w-5 text-indigo-400" /> Storage Usage</h1>
        <p className="text-muted-foreground text-sm">Across every employee and lead document in your workspace.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <p className="text-foreground text-2xl font-semibold">{formatBytes(usage.usedBytes)} <span className="text-muted-foreground text-sm font-normal">used</span></p>
          {usage.limitBytes != null ? (
            <p className="text-muted-foreground text-sm">{formatBytes(usage.remainingBytes)} remaining of {formatBytes(usage.limitBytes)}</p>
          ) : (
            <p className="text-muted-foreground text-sm">No plan storage limit configured.</p>
          )}
        </div>
        {usage.percentUsed != null && (
          <div className="h-2.5 rounded-full bg-muted overflow-hidden mb-4">
            <div className={`h-full rounded-full transition-all ${usage.percentUsed >= 90 ? "bg-red-500" : usage.percentUsed >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${usage.percentUsed}%` }} />
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
          {usage.byModule.map((m) => (
            <div key={m.module}>
              <p className="text-muted-foreground text-xs">{m.module}</p>
              <p className="text-foreground font-medium">{formatBytes(m.bytes)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Largest Files" empty={!largestFiles.length}>
          <div className="divide-y divide-border">
            {largestFiles.map((f) => (
              <div key={`${f.source}-${f.id}`} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-foreground text-sm truncate">{f.file_name}</p>
                  <p className="text-muted-foreground text-xs">{f.source} · {f.owner_name} · {formatDateTime(f.created_at, timezone)}</p>
                </div>
                <span className="text-foreground text-xs font-medium shrink-0 ml-2">{formatBytes(f.file_size)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Storage by Employee" empty={!byEmployee.length}>
          <div className="divide-y divide-border">
            {byEmployee.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-foreground text-sm truncate">{e.name}</p>
                  <p className="text-muted-foreground text-xs">{e.file_count} file{e.file_count === 1 ? "" : "s"}</p>
                </div>
                <span className="text-foreground text-xs font-medium shrink-0 ml-2">{formatBytes(e.total_bytes)}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Storage by Lead" empty={!byLead.length} emptyLabel="No lead documents uploaded yet.">
          <div className="divide-y divide-border">
            {byLead.map((l) => (
              <div key={l.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-foreground text-sm truncate">{l.name}</p>
                  <p className="text-muted-foreground text-xs">{l.lead_number} · {l.file_count} file{l.file_count === 1 ? "" : "s"}</p>
                </div>
                <span className="text-foreground text-xs font-medium shrink-0 ml-2">{formatBytes(l.total_bytes)}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
