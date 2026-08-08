import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import ForbiddenState from "@/components/shared/ForbiddenState";
import LeadFormBuilder from "@/components/crm/forms/LeadFormBuilder";

export default async function NewLeadFormPage() {
  const session = await getSession();
  if (!(await can(session, "leads.create"))) return <ForbiddenState />;

  const [sources, services, usersResult] = await Promise.all([
    listLeadSources(session), listServices(session), listUsers(session, { status: "active", pageSize: 100 }),
  ]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Create Lead Form</h1>
      <p className="text-muted-foreground text-sm mb-6">Build a public form — anyone with the link or QR code can submit it, no login required.</p>
      <LeadFormBuilder sources={sources} services={services} users={usersResult.users} />
    </div>
  );
}
