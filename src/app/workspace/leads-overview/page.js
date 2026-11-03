import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listAggregatedSchoolLeads } from "@/lib/actions/companySwitch";
import { formatDateTime } from "@/lib/helpers/dateFormat";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadsOverviewFilters from "@/components/crm/leads/LeadsOverviewFilters";
import OpenLeadLink from "@/components/crm/leads/OpenLeadLink";
import Pagination from "@/components/shared/Pagination";
import { Building2 } from "lucide-react";

export default async function LeadsOverviewPage({ searchParams }) {
  const session = await getSession();
  if (!session.can_create_child_companies || !(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const result = await listAggregatedSchoolLeads(session, {
    schoolId: sp?.school || null,
    search: sp?.q || null,
    page: sp?.page || 1,
    pageSize: 20,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Leads Overview ({result.total})</h1>
        <p className="text-muted-foreground text-sm mt-1">Every school's leads, combined — plus anything that came to Global Vista Educators directly, labeled Independent. Click a row to open it — you'll be switched into that school automatically.</p>
      </div>

      <LeadsOverviewFilters schools={result.schools} />

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground text-xs uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Phone / Email</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Priority</th>
              <th className="px-4 py-3 font-medium">School</th>
              <th className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {result.leads.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">No leads found.</td></tr>
            ) : result.leads.map((l) => (
              <OpenLeadLink key={l.id} leadId={l.id} companyId={l.company_id} homeCompanyId={session.home_company_id} gveCompanyId={session.company_id}>
                <td className="px-4 py-3 text-foreground font-medium">{l.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{l.phone || l.email || "—"}</td>
                <td className="px-4 py-3"><StageBadge stage={l.stage} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={l.priority} /></td>
                <td className="px-4 py-3">
                  {l.school_name ? (
                    <span className="flex items-center gap-1.5 text-foreground"><Building2 className="h-3.5 w-3.5 text-muted-foreground" />{l.school_name}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[11px] border bg-indigo-500/10 text-indigo-400 border-indigo-500/30">Independent</span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{formatDateTime(l.created_at)}</td>
              </OpenLeadLink>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}
