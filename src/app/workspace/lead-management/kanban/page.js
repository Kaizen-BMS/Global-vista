import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadsForKanban } from "@/lib/modules/crm/actions/leads";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadViewToggle from "@/components/crm/leads/LeadViewToggle";
import KanbanBoard from "@/components/crm/leads/KanbanBoard";

export default async function LeadKanbanPage() {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const [leads, canCreate, canClaim, canManageAssignment] = await Promise.all([
    listLeadsForKanban(session),
    can(session, "leads.create"),
    can(session, "leads.update"),
    can(session, "leads.assign"),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Lead Pipeline</h1>
          <p className="text-muted-foreground text-xs mt-0.5">Drag a card to change its stage · showing up to 500 most recently updated, non-closed leads</p>
        </div>
        <div className="flex items-center gap-2">
          <LeadViewToggle active="kanban" />
          {canCreate && (
            <Link href="/workspace/lead-management/new" className="btn-brand flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium cursor-pointer hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Add Lead
            </Link>
          )}
        </div>
      </div>
      <KanbanBoard initialLeads={leads} currentUserId={session.id} canClaim={canClaim} canManageAssignment={canManageAssignment} />
    </div>
  );
}
