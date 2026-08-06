import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeads } from "@/lib/modules/crm/actions/leads";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFilters from "@/components/crm/leads/LeadFilters";
import LeadsTable from "@/components/crm/leads/LeadsTable";
import Pagination from "@/components/shared/Pagination";

export default async function LeadManagementPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const [result, sources, services, canCreate, canAssign, canUpdate] = await Promise.all([
    listLeads(session, {
      status: sp?.status || null, stage: sp?.stage || null, priority: sp?.priority || null,
      sourceId: sp?.sourceId || null, serviceId: sp?.serviceId || null, search: sp?.search || null,
      page: sp?.page || 1, pageSize: 20,
    }),
    listLeadSources(session),
    listServices(session),
    can(session, "leads.create"),
    can(session, "leads.assign"),
    can(session, "leads.update"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-white">Leads ({result.total})</h1>
        {canCreate && (
          <Link href="/workspace/lead-management/new" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition">
            <Plus className="h-4 w-4" /> Add Lead
          </Link>
        )}
      </div>

      <LeadFilters sources={sources} services={services} />
      <LeadsTable leads={result.leads} canBulkAssign={canAssign} canBulkUpdate={canUpdate} />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}
