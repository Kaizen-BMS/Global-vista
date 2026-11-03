import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/modules/crm/actions/leads";
import { listLeadNotes } from "@/lib/modules/crm/actions/leadNotes";
import { listLeadFollowups } from "@/lib/modules/crm/actions/leadFollowups";
import { listLeadMeetings } from "@/lib/modules/crm/actions/leadMeetings";
import { listLeadTasks } from "@/lib/modules/crm/actions/leadTasks";
import { listLeadDocuments } from "@/lib/modules/crm/actions/leadDocuments";
import { listLeadCalls, getCallingSettings } from "@/lib/modules/crm/actions/leadCalling";
import { getLeadTimeline } from "@/lib/modules/crm/actions/leadTimeline";
import { listPaymentPlansForLead, getPaymentPlanDetail } from "@/lib/modules/crm/actions/payments";
import { listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { getAvailablePaymentMethods } from "@/lib/payments/providers";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import { listLeadDocumentTypes } from "@/lib/modules/crm/actions/leadDocumentTypes";
import { getLeadDetailFieldGroups, getLeadProfileCompletion } from "@/lib/modules/crm/actions/leadFieldLayout";
import { getLeadPipelineStages } from "@/lib/modules/crm/actions/leadPipelineStages";
import { hasLeadDocumentTypesSchema } from "@/lib/db/schemaFlags";
import { ListChecks } from "lucide-react";
import LeadHeader from "@/components/crm/leads/LeadHeader";
import ActivityComposer from "@/components/crm/leads/ActivityComposer";
import ActivityTimeline from "@/components/crm/leads/ActivityTimeline";
import LeadWorkspaceTabs from "@/components/crm/leads/LeadWorkspaceTabs";
import LeadWhatsAppPanel from "@/components/crm/leads/LeadWhatsAppPanel";
import LeadScoreMeter from "@/components/crm/badges/LeadScoreMeter";
import ProfileCompletionBar from "@/components/crm/leads/ProfileCompletionBar";
import LeadFieldsDisplay from "@/components/crm/leads/LeadFieldsDisplay";
import LeadTasks from "@/components/crm/leads/LeadTasks";
import LeadDocuments from "@/components/crm/leads/LeadDocuments";
import LeadPayments from "@/components/crm/leads/LeadPayments";
import LeadCalls from "@/components/crm/leads/LeadCalls";
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

  const paymentsEnabled = (await isModuleEnabledForCompany(session.company_id, "payments")) && !session.is_child_company;
  // Payments, Documents, and Calls aren't part of a school's counselling
  // workflow (the equivalent Settings pages are already hidden for
  // schools) — the whole sidebar section, and the header's matching quick
  // actions, are dropped for schools rather than just visually hidden.
  const showDocuments = !session.is_child_company;
  const showCalls = !session.is_child_company;
  const documentTypesSchemaReady = await hasLeadDocumentTypesSchema();

  const [
    notes, followups, meetings, tasks, documents, timeline, paymentPlans, services, availableMethods,
    canEdit, canManageNotes, canManageFollowups, canManageTasks, canManageDocs, canManageAssignment, canDelete,
    rawFieldGroups, documentTypes, employeesResult,
    calls, canMakeCalls, canViewCalls, callingSettings, stages,
  ] = await Promise.all([
    listLeadNotes(session, id), listLeadFollowups(session, id), listLeadMeetings(session, id), listLeadTasks(session, id),
    listLeadDocuments(session, id), getLeadTimeline(session, id),
    paymentsEnabled ? listPaymentPlansForLead(session, id) : [],
    paymentsEnabled ? listServices(session) : [],
    paymentsEnabled ? getAvailablePaymentMethods(session) : [],
    can(session, "leads.update"), can(session, "leads.notes.manage"), can(session, "leads.followups.manage"),
    can(session, "leads.tasks.manage"), can(session, "leads.documents.manage"), can(session, "leads.assign"),
    can(session, "leads.delete"),
    getLeadDetailFieldGroups(session, lead),
    documentTypesSchemaReady ? listLeadDocumentTypes(session, { activeOnly: true }) : [],
    listUsers(session, { status: "active", pageSize: 100 }),
    showCalls ? listLeadCalls(session, id) : [],
    showCalls ? can(session, "leads.calls.make") : false,
    showCalls ? can(session, "leads.calls.view") : false,
    showCalls ? getCallingSettings(session) : Promise.resolve({ configured: false, hasCredentials: false }),
    getLeadPipelineStages(session),
  ]);

  // Not hardcoded — getLeadDetailFieldGroups returns one entry per
  // section (Lead Source/Service/Priority/Assign-To/Tags live under
  // "Source & Assignment"), which isn't part of a school's counselling
  // workflow (Priority especially — see LeadHeader/LeadsTable).
  const fieldGroups = session.is_child_company
    ? rawFieldGroups.filter((g) => g.section.name !== "Source & Assignment")
    : rawFieldGroups;

  // The "active" plan is the most recent one that isn't Cancelled/Refunded —
  // older negotiations stay visible in the plan list but don't drive the
  // summary cards or the Record Payment flow once superseded.
  const activePlan = paymentPlans.find((p) => !["Cancelled", "Refunded"].includes(p.status)) || paymentPlans[0] || null;
  const activePlanDetail = paymentsEnabled && activePlan ? await getPaymentPlanDetail(session, activePlan.id) : null;

  const score = computeLeadScore(lead, { notesCount: notes.length, tasksCount: tasks.length, followupsCount: followups.length, stages });
  const tags = (lead.tags || "").split(",").map((t) => t.trim()).filter(Boolean);
  const profileCompletion = session.is_child_company ? await getLeadProfileCompletion(session, lead) : null;

  return (
    <div>
      {session.is_child_company && <ProfileCompletionBar completion={profileCompletion} />}

      {!!lead.is_duplicate && lead.duplicate_of && (
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
        canEdit={canEdit} canManageAssignment={canManageAssignment} canManageDocs={canManageDocs && showDocuments}
        canDelete={canDelete} paymentsEnabled={paymentsEnabled} employees={employeesResult.users} callsEnabled={canViewCalls}
      />

      <div className={`grid grid-cols-1 lg:grid-cols-3 ${session.is_child_company ? "gap-4" : "gap-6"}`}>
        {/* Main column — the activity workspace */}
        <div className="lg:col-span-2 min-w-0">
          <ActivityComposer lead={lead} canManageFollowups={canManageFollowups} canManageNotes={canManageNotes} isChildCompany={session.is_child_company} />
          <LeadWorkspaceTabs
            timelineSlot={
              <ActivityTimeline
                leadId={id} events={timeline} followups={followups} meetings={meetings} notes={notes} documents={documents}
                canManageFollowups={canManageFollowups} canManageNotes={canManageNotes} isChildCompany={session.is_child_company}
              />
            }
            whatsappSlot={
              <LeadWhatsAppPanel leadId={id} lead={lead} initialFollowups={followups} canManageFollowups={canManageFollowups} />
            }
          />
        </div>

        {/* Sidebar — supporting information, kept as existing components in compact cards */}
        <div className={`${session.is_child_company ? "space-y-4" : "space-y-6"} min-w-0`}>
          {!session.is_child_company && <LeadScoreMeter score={score} />}

          <LeadFieldsDisplay leadId={id} groups={fieldGroups} />

          {paymentsEnabled && (
            <div id="payments" className="bg-card border border-border rounded-2xl p-5 scroll-mt-6">
              <p className="text-foreground font-medium mb-3">Payments</p>
              <LeadPayments
                leadId={id} lead={lead} plans={paymentPlans} activePlan={activePlanDetail} services={services}
                availableMethods={availableMethods} canManage={canEdit}
              />
            </div>
          )}

          {showDocuments && (
            <div id="documents" className="bg-card border border-border rounded-2xl p-5 scroll-mt-6">
              <p className="text-foreground font-medium mb-3">Documents</p>
              <LeadDocuments leadId={id} documents={documents} canManage={canManageDocs} documentTypes={documentTypes} />
            </div>
          )}

          {canViewCalls && (
            <div id="calls" className="bg-card border border-border rounded-2xl p-5 scroll-mt-6">
              <p className="text-foreground font-medium mb-3">Calls</p>
              <LeadCalls
                leadId={id} initialCalls={calls} canMakeCalls={canMakeCalls} canViewCalls={canViewCalls}
                callingConfigured={callingSettings.configured} callingHasCredentials={callingSettings.hasCredentials}
              />
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-foreground font-medium mb-3 flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground" /> Tasks</p>
            <LeadTasks leadId={id} tasks={tasks} canManage={canManageTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
