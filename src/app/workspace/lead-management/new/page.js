import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import LeadForm from "@/components/modules/crm/forms/LeadForm";
import ForbiddenState from "@/components/shared/ForbiddenState";

export default async function NewLeadPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;

  const [sources, services, counsellorsResult] = await Promise.all([
    listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Add Lead</h1>
      <p className="text-neutral-500 text-sm mb-6">Fill in as much detail as you have — you can complete the rest later.</p>
      <LeadForm sources={sources} services={services} counsellors={counsellorsResult.users} />
    </div>
  );
}