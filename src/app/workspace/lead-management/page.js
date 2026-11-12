import Link from "next/link";
import { Plus, Upload, Download } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeads, listDistinctTags } from "@/lib/modules/crm/actions/leads";
import { listAggregatedSchoolLeads, getAggregatedLeadsBySource, getAggregatedLeadsByService, getAggregatedDistinctTags } from "@/lib/actions/companySwitch";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { getLeadsByStage } from "@/lib/modules/crm/actions/dashboard";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { listLeadCustomFields } from "@/lib/modules/crm/actions/leadCustomFields";
import { isImportExportAllowed } from "@/lib/platform/tenant";
import { getCrmTerms } from "@/lib/helpers/crmTerms";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFilters from "@/components/crm/leads/LeadFilters";
import StageTabs from "@/components/crm/leads/StageTabs";
import LeadsTable from "@/components/crm/leads/LeadsTable";
import LeadViewToggle from "@/components/crm/leads/LeadViewToggle";
import Pagination from "@/components/shared/Pagination";
import ScrollRestorer from "@/components/crm/leads/ScrollRestorer";

export default async function LeadManagementPage({ searchParams }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const sp = await searchParams;
  const terms = getCrmTerms(session.is_child_company);
  const isChildCompany = session.is_child_company;
  // GVE sees every school's leads combined here — plus anything that came
  // to GVE directly, labeled Direct Lead — instead of a separate "Leads
  // Overview" page; this IS "Leads" for GVE. See listAggregatedSchoolLeads.
  const isAggregated = !isChildCompany && !!session.can_create_child_companies;
  // ?cf_<field_key>=<value> — one URL param per Student Information
  // filter (Stream/Class/Predicted Grade/District/…), built dynamically
  // in LeadFilters from this same company's own custom field list rather
  // than a hardcoded set, so a field added later is filterable with no
  // code change here. Schools only — GVE's combined view doesn't offer
  // these (each school has its own separate custom field rows, same
  // reasoning Stage/Source/Service filtering already follows there).
  const customFieldFilters = isChildCompany
    ? Object.fromEntries(Object.entries(sp || {}).filter(([k]) => k.startsWith("cf_")).map(([k, v]) => [k.slice(3), v]))
    : null;

  const [result, stages, stageCountRows, sourceRows, serviceRows, tags, counsellorsResult, canCreate, canAssign, canUpdate, canImportExport, canManageNotes, customFields] = await Promise.all([
    isAggregated
      ? listAggregatedSchoolLeads(session, {
          schoolId: sp?.school || null, search: sp?.q || sp?.search || null, priority: sp?.priority || null,
          assignedTo: sp?.assignedTo || null, tag: sp?.tag || null,
          sourceName: sp?.sourceId || null, serviceName: sp?.serviceId || null,
          createdFrom: sp?.createdFrom || null, createdTo: sp?.createdTo || null,
          page: sp?.page || 1, pageSize: 20,
        })
      : listLeads(session, {
          status: sp?.status || null, stage: sp?.stage || null, priority: sp?.priority || null,
          sourceId: sp?.sourceId || null, serviceId: sp?.serviceId || null, search: sp?.search || null,
          assignedTo: sp?.assignedTo || null, country: sp?.country || null, tag: sp?.tag || null,
          createdFrom: sp?.createdFrom || null, createdTo: sp?.createdTo || null,
          followupFrom: sp?.followupFrom || null, followupTo: sp?.followupTo || null,
          customFieldFilters,
          sort: sp?.sort || "created_at", dir: sp?.dir || "DESC",
          page: sp?.page || 1, pageSize: 20,
        }),
    getLeadPipelineStages(session),
    isChildCompany ? getLeadsByStage(session) : [],
    // For GVE's combined view, Source/Service options are distinct NAMES
    // aggregated across every school (each school has its own separate
    // lead_sources/services rows, so an id only ever means something
    // within one company) — same data getAggregatedLeadsBySource/Service
    // already compute for the dashboard's own pie charts.
    isAggregated ? getAggregatedLeadsBySource(session) : listLeadSources(session),
    isAggregated ? getAggregatedLeadsByService(session) : listServices(session),
    isAggregated ? getAggregatedDistinctTags(session) : listDistinctTags(session),
    listUsers(session, { status: "active", pageSize: 100 }),
    can(session, "leads.create"),
    can(session, "leads.assign"),
    can(session, "leads.update"),
    isImportExportAllowed(session.company_id),
    can(session, "leads.notes.manage"),
    isChildCompany ? listLeadCustomFields(session, { activeOnly: true }) : [],
  ]);
  const stageCounts = Object.fromEntries(stageCountRows.map((r) => [r.stage, r.count]));
  // LeadFilters' Source/Service <option>s read {id, name} — for the
  // aggregated case the "id" submitted back as ?sourceId=/&serviceId= is
  // really the NAME (see sourceName/serviceName above), so the dropdown
  // itself needs no further change, just a {id: name, name} shape here.
  const sources = isAggregated ? sourceRows.map((r) => ({ id: r.source, name: r.source })) : sourceRows;
  const services = isAggregated ? serviceRows.map((r) => ({ id: r.service, name: r.service })) : serviceRows;

  return (
    <div>
      <ScrollRestorer />
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
            <Link href="/workspace/lead-management/new" data-tour-target="students-add-btn" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add {terms.singular}
            </Link>
          )}
        </div>
      </div>

      {isChildCompany && <StageTabs stages={stages} counts={stageCounts} total={result.total} />}
      <LeadFilters
        sources={sources} services={services}
        counsellors={isAggregated ? [] : counsellorsResult.users}
        tags={tags} allowImportExport={canImportExport} stages={stages} isChildCompany={isChildCompany}
        aggregated={isAggregated} schools={result.schools || []}
        customFields={customFields}
      />
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
        customFields={customFields}
        aggregated={isAggregated}
        homeCompanyId={session.home_company_id}
        gveCompanyId={session.company_id}
        totalCount={result.total}
      />
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} />
    </div>
  );
}
