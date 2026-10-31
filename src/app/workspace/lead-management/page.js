import Link from "next/link";
import { Plus, Upload, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeads, listDistinctTags } from "@/lib/modules/crm/actions/leads";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { getLeadsByStage } from "@/lib/modules/crm/actions/dashboard";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { isImportExportAllowed } from "@/lib/platform/tenant";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFilters from "@/components/crm/leads/LeadFilters";
import AssignedToQuickTabs from "@/components/crm/leads/AssignedToQuickTabs";
import StageTabs from "@/components/crm/leads/StageTabs";
import LeadsTable from "@/components/crm/leads/LeadsTable";
import LeadViewToggle from "@/components/crm/leads/LeadViewToggle";
import Pagination from "@/components/shared/Pagination";

export default async function LeadManagementPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const terms = getCrmTerms(session.is_child_company);
  const isChildCompany = session.is_child_company;
  const [result, stages, stageCountRows, sources, services, tags, counsellorsResult, canCreate, canAssign, canUpdate, canImportExport, canManageNotes] = await Promise.all([
    listLeads(session, {
      status: sp?.status || null, stage: sp?.stage || null, priority: sp?.priority || null,
      sourceId: sp?.sourceId || null, serviceId: sp?.serviceId || null, search: sp?.search || null,
      assignedTo: sp?.assignedTo || null, country: sp?.country || null, tag: sp?.tag || null,
      createdFrom: sp?.createdFrom || null, createdTo: sp?.createdTo || null,
      followupFrom: sp?.followupFrom || null, followupTo: sp?.followupTo || null,
      sort: sp?.sort || "created_at", dir: sp?.dir || "DESC",
      page: sp?.page || 1, pageSize: 20,
    }),
    getLeadPipelineStages(session),
    isChildCompany ? getLeadsByStage(session) : [],
    listLeadSources(session),
    listServices(session),
    listDistinctTags(session),
    listUsers(session, { status: "active", pageSize: 100 }),
    can(session, "leads.create"),
    can(session, "leads.assign"),
    can(session, "leads.update"),
    isImportExportAllowed(session.company_id),
    can(session, "leads.notes.manage"),
  ]);
  const stageCounts = Object.fromEntries(stageCountRows.map((r) => [r.stage, r.count]));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-semibold text-foreground">{terms.plural} ({result.total})</h1>
        <div className="flex items-center gap-2">
          <LeadViewToggle active="list" />
          {canImportExport && (
            <>
              <Link href="/workspace/lead-management/import" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm font-medium transition cursor-pointer">
                <Upload className="h-4 w-4" /> Import
              </Link>
              {isChildCompany && (
                <>
                  <a href="/api/leads/export?format=xlsx" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm font-medium transition cursor-pointer" title="Export to Excel">
                    <Download className="h-4 w-4" /> Excel
                  </a>
                  <a href="/api/leads/export?format=csv" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm font-medium transition cursor-pointer" title="Export to CSV">
                    <Download className="h-4 w-4" /> CSV
                  </a>
                </>
              )}
            </>
          )}
          {canCreate && (
            <Link href="/workspace/lead-management/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add {terms.singular}
            </Link>
          )}
        </div>
      </div>

      {isChildCompany && <StageTabs stages={stages} counts={stageCounts} total={result.total} />}
      <AssignedToQuickTabs />
      <LeadFilters sources={sources} services={services} counsellors={counsellorsResult.users} tags={tags} allowImportExport={canImportExport} stages={stages} isChildCompany={isChildCompany} />
      <LeadsTable
        leads={result.leads}
        canBulkAssign={canAssign}
        canBulkUpdate={canUpdate}
        canClaim={canUpdate}
        canManageNotes={canManageNotes}
        currentUserId={session.id}
        assignableUsers={counsellorsResult.users}
        sortKey={sp?.sort || "created_at"}
        sortDir={sp?.dir || "DESC"}
        isChildCompany={isChildCompany}
        stages={stages}
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}
