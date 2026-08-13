import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/modules/crm/actions/leads";
import { listLeadNotes } from "@/lib/modules/crm/actions/leadNotes";
import { listLeadFollowups } from "@/lib/modules/crm/actions/leadFollowups";
import { listLeadTasks } from "@/lib/modules/crm/actions/leadTasks";
import { listLeadDocuments } from "@/lib/modules/crm/actions/leadDocuments";
import { getLeadTimeline } from "@/lib/modules/crm/actions/leadTimeline";
import { listPaymentPlansForLead, getPaymentPlanDetail } from "@/lib/modules/crm/actions/payments";
import { listServices } from "@/lib/actions/leadMeta";
import { getAvailablePaymentMethods } from "@/lib/payments/providers";
import { isModuleEnabledForCompany } from "@/lib/platform/tenant";
import Link from "next/link";
import { Pencil, Phone, Mail, Globe2, Briefcase, UserRound, PlaneTakeoff, FileCheck2 } from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import LeadScoreBadge from "@/components/crm/badges/LeadScoreBadge";
import LeadScoreBar from "@/components/crm/badges/LeadScoreBar";
import QuickActionBar from "@/components/crm/leads/QuickActionBar";
import LeadTabs from "@/components/crm/leads/LeadTabs";
import LeadTimeline from "@/components/crm/leads/LeadTimeline";
import LeadNotes from "@/components/crm/leads/LeadNotes";
import LeadFollowups from "@/components/crm/leads/LeadFollowups";
import LeadTasks from "@/components/crm/leads/LeadTasks";
import LeadDocuments from "@/components/crm/leads/LeadDocuments";
import LeadPayments from "@/components/crm/leads/LeadPayments";
import DuplicateBanner from "@/components/crm/leads/DuplicateBanner";
import { TakeLeadButton, ReleaseLeadButton } from "@/components/crm/leads/LeadAssignmentAction";
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

  const [notes, followups, tasks, documents, timeline, paymentPlans, services, availableMethods, canEdit, canManageNotes, canManageFollowups, canManageTasks, canManageDocs, canManageAssignment] = await Promise.all([
    listLeadNotes(session, id), listLeadFollowups(session, id), listLeadTasks(session, id),
    listLeadDocuments(session, id), getLeadTimeline(session, id),
    paymentsEnabled ? listPaymentPlansForLead(session, id) : [],
    paymentsEnabled ? listServices(session) : [],
    paymentsEnabled ? getAvailablePaymentMethods(session) : [],
    can(session, "leads.update"), can(session, "leads.notes.manage"), can(session, "leads.followups.manage"),
    can(session, "leads.tasks.manage"), can(session, "leads.documents.manage"), can(session, "leads.assign"),
  ]);

  // The "active" plan is the most recent one that isn't Cancelled/Refunded —
  // older negotiations stay visible in the plan list but don't drive the
  // summary cards or the Record Payment flow once superseded.
  const activePlan = paymentPlans.find((p) => !["Cancelled", "Refunded"].includes(p.status)) || paymentPlans[0] || null;
  const activePlanDetail = paymentsEnabled && activePlan ? await getPaymentPlanDetail(session, activePlan.id) : null;

  const tabLabels = ["Overview", "Timeline", "Notes", "Follow Ups", "Tasks", "Documents", ...(paymentsEnabled ? ["Payments"] : [])];

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

      <div className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 min-w-0">
            <div className="h-12 w-12 shrink-0 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center text-lg font-semibold">
              {lead.name?.trim()?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs mb-0.5">{lead.lead_number}</p>
              <h1 className="text-xl font-semibold text-foreground truncate">{lead.name}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StageBadge stage={lead.stage} />
                <PriorityBadge priority={lead.priority} />
                <LeadScoreBadge score={score} />
                {tags.map((tag) => (
                  <span key={tag} className="px-2 py-1 rounded-full text-xs border bg-muted text-foreground border-border">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {canEdit && (
              <Link href={`/workspace/lead-management/${id}/edit`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border text-foreground hover:text-foreground text-sm transition cursor-pointer">
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            )}
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-border">
          <QuickActionBar lead={lead} canManage={canManageFollowups} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <InfoBlock icon={Phone} label="Phone" value={lead.phone} />
          <InfoBlock icon={Mail} label="Email" value={lead.email || "—"} />
          <InfoBlock icon={Globe2} label="Country" value={lead.country || "—"} />
          <InfoBlock
            icon={UserRound}
            label="Assigned To"
            value={
              !lead.assigned_to
                ? (canEdit ? <TakeLeadButton leadId={id} /> : "Unassigned")
                : lead.assigned_to === session.id || canManageAssignment
                  ? <span className="flex items-center gap-2"><span className="truncate">{lead.assigned_name}</span><ReleaseLeadButton leadId={id} /></span>
                  : lead.assigned_name
            }
          />
          <InfoBlock icon={Briefcase} label="Source" value={lead.source_form_name ? `${lead.source_name} — ${lead.source_form_name}` : lead.source_name} />
          <InfoBlock icon={UserRound} label="Created By" value={lead.created_by_name || (lead.source_form_name ? "System (Public Form)" : "—")} />
          <InfoBlock icon={Briefcase} label="Service" value={lead.service_name} />
          <InfoBlock icon={PlaneTakeoff} label="Preferred Country" value={lead.preferred_country || "—"} />
          <InfoBlock icon={FileCheck2} label="Passport" value={lead.passport_status || "—"} />
        </div>

        <div className="mt-5">
          <LeadScoreBar score={score} />
        </div>
      </div>

      <LeadTabs tabs={tabLabels}>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-foreground text-sm whitespace-pre-wrap">{lead.remarks || "No remarks recorded."}</p>
        </div>
        <LeadTimeline events={timeline} />
        <LeadNotes leadId={id} notes={notes} canManage={canManageNotes} />
        <LeadFollowups leadId={id} followups={followups} canManage={canManageFollowups} />
        <LeadTasks leadId={id} tasks={tasks} canManage={canManageTasks} />
        <LeadDocuments leadId={id} documents={documents} canManage={canManageDocs} />
        {paymentsEnabled && (
          <LeadPayments
            leadId={id}
            plans={paymentPlans}
            activePlan={activePlanDetail}
            services={services}
            availableMethods={availableMethods}
            canManage={canEdit}
          />
        )}
      </LeadTabs>
    </div>
  );
}

function InfoBlock({ icon: Icon, label, value }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <p className="text-muted-foreground text-xs mb-1 flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3" />} {label}
      </p>
      <p className="text-foreground text-sm truncate">{value}</p>
    </div>
  );
}