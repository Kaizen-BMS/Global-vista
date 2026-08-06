import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeads, listDistinctTags } from "@/lib/modules/crm/actions/leads";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFilters from "@/components/crm/leads/LeadFilters";
import LeadsTable from "@/components/crm/leads/LeadsTable";
import LeadViewToggle from "@/components/crm/leads/LeadViewToggle";
import Pagination from "@/components/shared/Pagination";

export default async function LeadManagementPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const [result, sources, services, tags, counsellorsResult, canCreate, canAssign, canUpdate] = await Promise.all([
    listLeads(session, {
      status: sp?.status || null, stage: sp?.stage || null, priority: sp?.priority || null,
      sourceId: sp?.sourceId || null, serviceId: sp?.serviceId || null, search: sp?.search || null,
      assignedTo: sp?.assignedTo || null, country: sp?.country || null, tag: sp?.tag || null,
      createdFrom: sp?.createdFrom || null, createdTo: sp?.createdTo || null,
      followupFrom: sp?.followupFrom || null, followupTo: sp?.followupTo || null,
      page: sp?.page || 1, pageSize: 20,
    }),
    listLeadSources(session),
    listServices(session),
    listDistinctTags(session),
    listUsers(session, { status: "active", pageSize: 100 }),
    can(session, "leads.create"),
    can(session, "leads.assign"),
    can(session, "leads.update"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-white">Leads ({result.total})</h1>
        <div className="flex items-center gap-2">
          <LeadViewToggle active="list" />
          {canCreate && (
            <>
              <Link href="/workspace/lead-management/import" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm font-medium transition cursor-pointer">
                <Upload className="h-4 w-4" /> Import
              </Link>
              <Link href="/workspace/lead-management/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:-translate-y-0.5">
                <Plus className="h-4 w-4" /> Add Lead
              </Link>
            </>
          )}
        </div>
      </div>

      <LeadFilters sources={sources} services={services} counsellors={counsellorsResult.users} tags={tags} />
      <LeadsTable leads={result.leads} canBulkAssign={canAssign} canBulkUpdate={canUpdate} />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}
