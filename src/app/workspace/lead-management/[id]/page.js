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
import { listLeadDocumentTypes } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { getLeadDetailFieldGroups } from "@/lib/modules/crm/actions/leadFieldLayout";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { ListChecks } from "lucide-react";
import LeadHeader from "@/components/crm/leads/LeadHeader";
import ActivityComposer from "@/components/crm/leads/ActivityComposer";
import ActivityTimeline from "@/components/crm/leads/ActivityTimeline";
import LeadWorkspaceTabs from "@/components/crm/leads/LeadWorkspaceTabs";
import LeadWhatsAppPanel from "@/components/crm/leads/LeadWhatsAppPanel";
import LeadScoreMeter from "@/components/crm/badges/LeadScoreMeter";
import LeadFieldsDisplay from "@/components/crm/leads/LeadFieldsDisplay";
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
  const documentTypesSchemaReady = await hasLeadDocumentTypesSchema();

  const [
    notes, followups, meetings, tasks, documents, timeline, paymentPlans, services, availableMethods,
    canEdit, canManageNotes, canManageFollowups, canManageTasks, canManageDocs, canManageAssignment,
    fieldGroups, documentTypes, employeesResult,
  ] = await Promise.all([
    listLeadNotes(session, id), listLeadFollowups(session, id), listLeadMeetings(session, id), listLeadTasks(session, id),
    listLeadDocuments(session, id), getLeadTimeline(session, id),
    paymentsEnabled ? listPaymentPlansForLead(session, id) : [],
    paymentsEnabled ? listServices(session) : [],
    paymentsEnabled ? getAvailablePaymentMethods(session) : [],
    can(session, "leads.update"), can(session, "leads.notes.manage"), can(session, "leads.followups.manage"),
    can(session, "leads.tasks.manage"), can(session, "leads.documents.manage"), can(session, "leads.assign"),
    getLeadDetailFieldGroups(session, lead),
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
          <LeadWorkspaceTabs
            timelineSlot={
              <ActivityTimeline
                leadId={id} events={timeline} followups={followups} meetings={meetings} notes={notes} documents={documents}
                canManageFollowups={canManageFollowups} canManageNotes={canManageNotes}
              />
            }
            whatsappSlot={
              <LeadWhatsAppPanel leadId={id} lead={lead} initialFollowups={followups} canManageFollowups={canManageFollowups} />
            }
          />
        </div>

        {/* Sidebar — supporting information, kept as existing components in compact cards */}
        <div className="space-y-6 min-w-0">
          <LeadScoreMeter score={score} />

          <LeadFieldsDisplay leadId={id} groups={fieldGroups} />

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
