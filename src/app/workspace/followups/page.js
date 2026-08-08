import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getFollowupDashboard } from "@/lib/modules/crm/actions/leadFollowups";
import ForbiddenState from "@/components/shared/ForbiddenState";
import FollowupDashboard from "@/components/crm/leads/FollowupDashboard";

export default async function FollowupsPage() {
  const session = await getSession();
  if (!(await can(session, "leads.view"))) return <ForbiddenState />;

  const data = await getFollowupDashboard(session);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Follow-ups</h1>
      <p className="text-muted-foreground text-sm mb-6">Everything that needs your attention, automatically sorted — you never have to go looking for it.</p>
      <FollowupDashboard data={data} />
    </div>
  );
}
