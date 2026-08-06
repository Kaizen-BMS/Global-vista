import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/actions/leads";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import LeadForm from "@/components/crm/forms/LeadForm";
import ForbiddenState from "@/components/crm/shared/ForbiddenState";
import CrmNotFound from "@/app/crm/(protected)/not-found";

export default async function EditLeadPage({ params }) {
  const { id } = await params;
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return <ForbiddenState />;

  const [lead, sources, services, counsellorsResult] = await Promise.all([
    getLeadById(session, id),
    listLeadSources(),
    listServices(),
    listUsers({ status: "active", pageSize: 100 }),
  ]);

  if (!lead) return <CrmNotFound />;

  return (
    <div>
      <h1 className="text-xl font-semibold text-white mb-1">Edit Lead</h1>
      <p className="text-neutral-500 text-sm mb-6">{lead.lead_number}</p>
      <LeadForm sources={sources} services={services} counsellors={counsellorsResult.users} initialData={{ ...lead, id: lead.id }} />
    </div>
  );
}