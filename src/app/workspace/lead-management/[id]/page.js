import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/modules/crm/actions/leads";
import { listLeadNotes } from "@/lib/modules/crm/actions/leadNotes";
import { listLeadFollowups } from "@/lib/modules/crm/actions/leadFollowups";
import { listLeadMeetings } from "@/lib/modules/crm/actions/leadMeetings";
import { listLeadTasks } from "@/lib/modules/crm/actions/leadTasks";
import { listLeadDocuments } from "@/lib/modules/crm/actions/leadDocuments";
import { getLeadTimeline } from "@/lib/modules/crm/actions/leadTimeline";
import { listPaymentPlansForLead, getPaymentPlanDetail } from "@/lib/modules/crm/actions/payments";
import { listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { getAvailablePaymentMethods } from "@/lib/payments/providers";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import { getLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { listLeadDocumentTypes } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { hasLeadCustomFieldsSchema, hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { Globe2, Briefcase, UserRound, PlaneTakeoff, FileCheck2, ListChecks } from "lucide-react";
import LeadHeader from "@/components/crm/leads/LeadHeader";
import ActivityComposer from "@/components/crm/leads/ActivityComposer";
import ActivityTimeline from "@/components/crm/leads/ActivityTimeline";
import LeadCustomFieldsDisplay from "@/components/crm/leads/LeadCustomFieldsDisplay";
import LeadTasks from "@/components/crm/leads/LeadTasks";
import LeadDocuments from "@/components/crm/leads/LeadDocuments";
import LeadPayments from "@/components/crm/leads/LeadPayments";
import DuplicateBanner from "@/components/crm/leads/DuplicateBanner";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";
import { computeLeadScore } from "@/lib/modules/crm/leadScore";

export default async function LeadDetailsPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const { id } = await params;
  const lead = await getLeadById(session, id);
  if (!lead) return <WorkspaceNotFound />;

  const paymentsEnabled = await isModuleEnabledForCompany(session.company_id, "payments");
  const customFieldsSchemaReady = await hasLeadCustomFieldsSchema();
  const documentTypesSchemaReady = await hasLeadDocumentTypesSchema();

  const [
    notes, followups, meetings, tasks, documents, timeline, paymentPlans, services, availableMethods,
    canEdit, canManageNotes, canManageFollowups, canManageTasks, canManageDocs, canManageAssignment,
    customFieldValues, documentTypes, employeesResult,
  ] = await Promise.all([
    listLeadNotes(session, id), listLeadFollowups(session, id), listLeadMeetings(session, id), listLeadTasks(session, id),
    listLeadDocuments(session, id), getLeadTimeline(session, id),
    paymentsEnabled ? listPaymentPlansForLead(session, id) : [],
    paymentsEnabled ? listServices(session) : [],
    paymentsEnabled ? getAvailablePaymentMethods(session) : [],
    can(session, "leads.update"), can(session, "leads.notes.manage"), can(session, "leads.followups.manage"),
    can(session, "leads.tasks.manage"), can(session, "leads.documents.manage"), can(session, "leads.assign"),
    customFieldsSchemaReady ? getLeadCustomFieldValues(session, id) : [],
    documentTypesSchemaReady ? listLeadDocumentTypes(session, { activeOnly: true }) : [],
    listUsers(session, { status: "active", pageSize: 100 }),
  ]);

  // The "active" plan is the most recent one that isn't Cancelled/Refunded —
  // older negotiations stay visible in the plan list but don't drive the
  // summary cards or the Record Payment flow once superseded.
  const activePlan = paymentPlans.find((p) => !["Cancelled", "Refunded"].includes(p.status)) || paymentPlans[0] || null;
  const activePlanDetail = paymentsEnabled && activePlan ? await getPaymentPlanDetail(session, activePlan.id) : null;

  const score = computeLeadScore(lead, { notesCount: notes.length, tasksCount: tasks.length, followupsCount: followups.length });
  const tags = (lead.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const showCustomFields = customFieldsSchemaReady && customFieldValues.length > 0;

  return (
    <div>
      {lead.is_duplicate && lead.duplicate_of && (
        <DuplicateBanner
          leadId={id}
          duplicateOfId={lead.duplicate_of}
          duplicateOfName={lead.duplicate_of_name}
          duplicateOfNumber={lead.duplicate_of_number}
          canMerge={canEdit}
        />
      )}

      <LeadHeader
        lead={lead} leadId={id} score={score} tags={tags} session={session}
        canEdit={canEdit} canManageAssignment={canManageAssignment} canManageDocs={canManageDocs}
        paymentsEnabled={paymentsEnabled} employees={employeesResult.users}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column — the activity workspace */}
        <div className="lg:col-span-2 min-w-0">
          <ActivityComposer lead={lead} canManageFollowups={canManageFollowups} canManageNotes={canManageNotes} />
          <div className="bg-card border border-border rounded-2xl p-5 sm:p-6">
            <p className="text-foreground font-medium mb-4">Activity Timeline</p>
            <ActivityTimeline
              leadId={id} events={timeline} followups={followups} meetings={meetings} notes={notes} documents={documents}
              canManageFollowups={canManageFollowups} canManageNotes={canManageNotes}
            />
          </div>
        </div>

        {/* Sidebar — supporting information, kept as existing components in compact cards */}
        <div className="space-y-6 min-w-0">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-foreground font-medium mb-3">Lead Details</p>
            <div className="space-y-3">
              <DetailRow icon={Globe2} label="Country" value={lead.country || "—"} />
              <DetailRow icon={UserRound} label="Created By" value={lead.created_by_name || (lead.source_form_name ? "System (Public Form)" : "—")} />
              <DetailRow icon={Briefcase} label="Service" value={lead.service_name} />
              <DetailRow icon={PlaneTakeoff} label="Preferred Country" value={lead.preferred_country || "—"} />
              <DetailRow icon={FileCheck2} label="Passport" value={lead.passport_status || "—"} />
            </div>
            {lead.remarks && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-muted-foreground text-xs mb-1">Remarks</p>
                <p className="text-foreground text-sm whitespace-pre-wrap">{lead.remarks}</p>
              </div>
            )}
          </div>

          {showCustomFields && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-foreground font-medium mb-3">Custom Fields</p>
              <LeadCustomFieldsDisplay leadId={id} values={customFieldValues} />
            </div>
          )}

          {paymentsEnabled && (
            <div id="payments" className="bg-card border border-border rounded-2xl p-5 scroll-mt-6">
              <p className="text-foreground font-medium mb-3">Payments</p>
              <LeadPayments
                leadId={id} plans={paymentPlans} activePlan={activePlanDetail} services={services}
                availableMethods={availableMethods} canManage={canEdit}
              />
            </div>
          )}

          <div id="documents" className="bg-card border border-border rounded-2xl p-5 scroll-mt-6">
            <p className="text-foreground font-medium mb-3">Documents</p>
            <LeadDocuments leadId={id} documents={documents} canManage={canManageDocs} documentTypes={documentTypes} />
          </div>

          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-foreground font-medium mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /> Tasks</p>
            <LeadTasks leadId={id} tasks={tasks} canManage={canManageTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs shrink-0"><Icon className="h-3 w-3" /> {label}</span>
      <span className="text-foreground text-right truncate">{value}</span>
    </div>
  );
}
