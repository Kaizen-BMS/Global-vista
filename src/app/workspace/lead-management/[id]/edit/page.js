import { getSession } from "@/lib/auth";
import { can } from "@/lib/helpers/permissions";
import { getLeadById } from "@/lib/modules/crm/actions/leads";
import { listLeadSources, listServices } from "@/lib/actions/leadMeta";
import { listUsers } from "@/lib/actions/users";
import { listDistinctTags } from "@/lib/modules/crm/actions/leads";
import { listLeadCustomFields, getLeadCustomFieldValues } from "@/lib/modules/crm/actions/leadCustomFields";
import { hasLeadCustomFieldsSchema } from "@/lib/db/schemaFlags";
import LeadForm from "@/components/modules/crm/forms/LeadForm";
import ForbiddenState from "@/components/shared/ForbiddenState";
import WorkspaceNotFound from "@/app/workspace/not-found";

export default async function EditLeadPage({ params }) {
  const session = await getSession();
  if (!(await can(session, "leads.update"))) return <ForbiddenState />;

  const { id } = await params;
  const schemaReady = await hasLeadCustomFieldsSchema();
  const [lead, sources, services, counsellorsResult, tags, customFields, customValues] = await Promise.all([
    getLeadById(session, id), listLeadSources(session), listServices(session),
    listUsers(session, { status: "active", pageSize: 100 }), listDistinctTags(session),
    schemaReady ? listLeadCustomFields(session, { activeOnly: true, context: "lead_form" }) : [],
    schemaReady ? getLeadCustomFieldValues(session, id) : [],
  ]);

  if (!lead) return <WorkspaceNotFound />;

  const initialCustomValues = Object.fromEntries(customValues.map((v) => [v.field_id, v.value]));

  return (
    <div>
      <h1 className="text-xl font-semibold text-foreground mb-1">Edit Lead</h1>
      <p className="text-muted-foreground text-sm mb-6">{lead.lead_number}</p>
      <LeadForm
        sources={sources} services={services} counsellors={counsellorsResult.users} tagSuggestions={tags}
        initialData={{ ...lead, id: lead.id }} customFields={customFields} initialCustomValues={initialCustomValues}
      />
    </div>
  );
}