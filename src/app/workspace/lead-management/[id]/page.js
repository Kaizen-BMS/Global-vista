import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/modules/crm/actions/leads";
import { listLeadNotes } from "@/lib/modules/crm/actions/leadNotes";
import { listLeadFollowups } from "@/lib/modules/crm/actions/leadFollowups";
import { listLeadTasks } from "@/lib/modules/crm/actions/leadTasks";
import { listLeadDocuments } from "@/lib/modules/crm/actions/leadDocuments";
import { getLeadTimeline } from "@/lib/modules/crm/actions/leadTimeline";
import Link from "next/link";
import { Pencil } from "lucide-react";
import StageBadge from "@/components/crm/badges/StageBadge";
import PriorityBadge from "@/components/crm/badges/PriorityBadge";
import LeadScoreBadge from "@/components/crm/badges/LeadScoreBadge";
import LeadTabs from "@/components/crm/leads/LeadTabs";
import LeadTimeline from "@/components/crm/leads/LeadTimeline";
import LeadNotes from "@/components/crm/leads/LeadNotes";
import LeadFollowups from "@/components/crm/leads/LeadFollowups";
import LeadTasks from "@/components/crm/leads/LeadTasks";
import LeadDocuments from "@/components/crm/leads/LeadDocuments";
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

  const [notes, followups, tasks, documents, timeline, canEdit, canManageNotes, canManageFollowups, canManageTasks, canManageDocs] = await Promise.all([
    listLeadNotes(session, id), listLeadFollowups(session, id), listLeadTasks(session, id),
    listLeadDocuments(session, id), getLeadTimeline(session, id),
    can(session, "leads.update"), can(session, "leads.notes.manage"), can(session, "leads.followups.manage"),
    can(session, "leads.tasks.manage"), can(session, "leads.documents.manage"),
  ]);

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

      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-neutral-500 text-xs mb-1">{lead.lead_number}</p>
          <h1 className="text-xl font-semibold text-white">{lead.name}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <StageBadge stage={lead.stage} />
            <PriorityBadge priority={lead.priority} />
            <LeadScoreBadge score={score} />
            {tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full text-xs border bg-neutral-800 text-neutral-300 border-neutral-700">#{tag}</span>
            ))}
          </div>
        </div>
        {canEdit && (
          <Link href={`/workspace/lead-management/${id}/edit`} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-white text-sm transition">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <InfoBlock label="Phone" value={lead.phone} />
        <InfoBlock label="Email" value={lead.email || "—"} />
        <InfoBlock label="Country" value={lead.country || "—"} />
        <InfoBlock label="Assigned To" value={lead.assigned_name || "Unassigned"} />
        <InfoBlock label="Source" value={lead.source_name} />
        <InfoBlock label="Service" value={lead.service_name} />
        <InfoBlock label="Preferred Country" value={lead.preferred_country || "—"} />
        <InfoBlock label="Passport" value={lead.passport_status || "—"} />
      </div>

      <LeadTabs>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-neutral-300 text-sm whitespace-pre-wrap">{lead.remarks || "No remarks recorded."}</p>
        </div>
        <LeadTimeline events={timeline} />
        <LeadNotes leadId={id} notes={notes} canManage={canManageNotes} />
        <LeadFollowups leadId={id} followups={followups} canManage={canManageFollowups} />
        <LeadTasks leadId={id} tasks={tasks} canManage={canManageTasks} />
        <LeadDocuments leadId={id} documents={documents} canManage={canManageDocs} />
      </LeadTabs>
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
      <p className="text-neutral-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm truncate">{value}</p>
    </div>
  );
}